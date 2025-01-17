import { ethers, providers, Contract, Wallet, utils } from 'ethers';
import { config } from '../config';

type NetworkType = 'base' | 'aetherius' | 'baseTestnet' | 'aetheriusTestnet';
type NetworkPair = {
  base: NetworkType;
  aetherius: NetworkType;
};

// Assert config type at runtime
const typedConfig = config as {
  validatorPrivateKey: string;
  networks: {
    [K in NetworkType]: {
      rpcUrl: string;
      contracts: {
        bridge: string;
      };
    };
  };
  isTestnet: boolean;
};

const BASE_BRIDGE_ABI = [
  "event TokensLocked(address indexed token, address indexed sender, uint256 amount, address indexed recipient, uint256 nonce)",
  "function unlockTokens(address token, address recipient, uint256 amount, uint256 nonce) external",
  "function processedNonces(uint256) external view returns (bool)"
];

const AETHERIUS_BRIDGE_ABI = [
  "event TokensBurned(address indexed token, address indexed sender, uint256 amount, address indexed recipient, uint256 nonce)",
  "function mintWrappedTokens(address originalToken, address recipient, uint256 amount, uint256 nonce) external",
  "function deployWrappedToken(address originalToken, string name, string symbol) external returns (address)",
  "function wrappedTokens(address) external view returns (address)",
  "function processedNonces(uint256) external view returns (bool)"
];

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

export class AutomatedValidatorService {
  private static instance: AutomatedValidatorService;
  private baseProvider!: providers.JsonRpcProvider;
  private aetheriusProvider!: providers.JsonRpcProvider;
  private baseBridgeContract!: Contract;
  private aetheriusBridgeContract!: Contract;
  private validatorWallet!: Wallet;
  private isProcessing: boolean = false;
  private isRunning: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private eventListeners: { [key: string]: (...args: any[]) => void } = {};
  private networks: NetworkPair;

  private constructor() {
    this.networks = {
      base: typedConfig.isTestnet ? 'baseTestnet' : 'base',
      aetherius: typedConfig.isTestnet ? 'aetheriusTestnet' : 'aetherius'
    };
    this.validateEnvironment();
    this.initializeProviders();
    this.initializeContracts();
  }

  private validateEnvironment() {
    if (!process.env.VALIDATOR_PRIVATE_KEY) {
      throw new Error('VALIDATOR_PRIVATE_KEY environment variable is required');
    }
    
    const networkType = typedConfig.isTestnet ? 'testnet' : 'mainnet';
    
    if (!typedConfig.networks[this.networks.base].contracts.bridge || !typedConfig.networks[this.networks.aetherius].contracts.bridge) {
      throw new Error(`Bridge contract addresses for ${networkType} are required`);
    }
    if (!typedConfig.networks[this.networks.base].rpcUrl || !typedConfig.networks[this.networks.aetherius].rpcUrl) {
      throw new Error(`RPC URLs for ${networkType} are required`);
    }
  }

  private initializeProviders() {
    try {
      this.baseProvider = new providers.JsonRpcProvider(typedConfig.networks[this.networks.base].rpcUrl);
      this.aetheriusProvider = new providers.JsonRpcProvider(typedConfig.networks[this.networks.aetherius].rpcUrl);
      
      // Initialize validator wallet
      const privateKey = process.env.VALIDATOR_PRIVATE_KEY!;
      this.validatorWallet = new Wallet(privateKey);
      
      console.log(`Initialized providers for ${typedConfig.isTestnet ? 'testnet' : 'mainnet'} networks`);
    } catch (error) {
      console.error('Failed to initialize providers:', error);
      throw error;
    }
  }

  private initializeContracts() {
    try {
      this.baseBridgeContract = new Contract(
        typedConfig.networks[this.networks.base].contracts.bridge,
        BASE_BRIDGE_ABI,
        this.validatorWallet.connect(this.baseProvider)
      );

      this.aetheriusBridgeContract = new Contract(
        typedConfig.networks[this.networks.aetherius].contracts.bridge,
        AETHERIUS_BRIDGE_ABI,
        this.validatorWallet.connect(this.aetheriusProvider)
      );

      console.log(`Initialized contracts for ${typedConfig.isTestnet ? 'testnet' : 'mainnet'} networks`);
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
      throw error;
    }
  }

  public static getInstance(): AutomatedValidatorService {
    if (!AutomatedValidatorService.instance) {
      AutomatedValidatorService.instance = new AutomatedValidatorService();
    }
    return AutomatedValidatorService.instance;
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    retries = MAX_RETRIES
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await operation();
      } catch (error) {
        if (i === retries - 1) throw error;
        console.log(`Retry attempt ${i + 1}/${retries} failed, retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
    throw new Error('Operation failed after max retries');
  }

  private startHealthCheck() {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await Promise.all([
          this.baseProvider.getBlockNumber(),
          this.aetheriusProvider.getBlockNumber()
        ]);
      } catch (error) {
        console.error('Health check failed:', error);
        this.reconnect();
      }
    }, 30000); // Every 30 seconds
  }

  private async reconnect() {
    console.log('Reconnecting to networks...');
    try {
      await this.shutdown();
      this.initializeProviders();
      this.initializeContracts();
      await this.setupEventListeners();
      console.log('Reconnection successful');
    } catch (error) {
      console.error('Reconnection failed:', error);
      if (!this.reconnectInterval) {
        this.reconnectInterval = setInterval(() => this.reconnect(), 60000); // Retry every minute
      }
    }
  }

  private async setupEventListeners() {
    // Base -> Aetherius bridge listener
    this.eventListeners.tokensLocked = async (...args: any[]) => {
      if (this.isProcessing) return;
      this.isProcessing = true;

      try {
        const [token, sender, amount, recipient, nonce] = args;
        await this.processBaseToAetherius(token, amount, recipient, nonce);
      } catch (error) {
        console.error('Error processing Base -> Aetherius bridge:', error);
      } finally {
        this.isProcessing = false;
      }
    };

    // Aetherius -> Base bridge listener
    this.eventListeners.tokensBurned = async (...args: any[]) => {
      if (this.isProcessing) return;
      this.isProcessing = true;

      try {
        const [token, sender, amount, recipient, nonce] = args;
        await this.processAetheriusToBase(token, amount, recipient, nonce);
      } catch (error) {
        console.error('Error processing Aetherius -> Base bridge:', error);
      } finally {
        this.isProcessing = false;
      }
    };

    this.baseBridgeContract.on('TokensLocked', this.eventListeners.tokensLocked);
    this.aetheriusBridgeContract.on('TokensBurned', this.eventListeners.tokensBurned);
  }

  public async startValidating() {
    if (this.isRunning) {
      console.log('Validator is already running');
      return;
    }

    console.log('Starting automated validator service...');
    
    try {
      await this.setupEventListeners();
      this.startHealthCheck();
      this.isRunning = true;
      
      // Log validator address and balance
      const address = await this.validatorWallet.getAddress();
      const [baseBalance, aetheriusBalance] = await Promise.all([
        this.baseProvider.getBalance(address),
        this.aetheriusProvider.getBalance(address)
      ]);

      console.log(`Validator running with address: ${address}`);
      console.log(`Base balance: ${utils.formatEther(baseBalance)} ETH`);
      console.log(`Aetherius balance: ${utils.formatEther(aetheriusBalance)} AIC`);

      // Set up graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
    } catch (error) {
      console.error('Failed to start validator:', error);
      throw error;
    }
  }

  public async shutdown() {
    console.log('Shutting down validator service...');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    // Remove event listeners
    if (this.eventListeners.tokensLocked) {
      this.baseBridgeContract.off('TokensLocked', this.eventListeners.tokensLocked);
    }
    if (this.eventListeners.tokensBurned) {
      this.aetheriusBridgeContract.off('TokensBurned', this.eventListeners.tokensBurned);
    }

    this.isRunning = false;
    console.log('Validator service stopped');
  }

  private async processBaseToAetherius(
    token: string,
    amount: bigint,
    recipient: string,
    nonce: bigint
  ) {
    console.log(`Processing Base -> Aetherius bridge (Nonce: ${nonce})`);

    try {
      // Check if already processed
      const processed = await this.retryOperation(async () => 
        this.aetheriusBridgeContract.processedNonces(nonce)
      );
      
      if (processed) {
        console.log(`Nonce ${nonce} already processed`);
        return;
      }

      // Get or deploy wrapped token
      let wrappedToken = await this.retryOperation(async () =>
        this.aetheriusBridgeContract.wrappedTokens(token)
      );

      if (wrappedToken === ethers.constants.AddressZero) {
        const tokenContract = new Contract(
          token,
          ['function name() view returns (string)', 'function symbol() view returns (string)'],
          this.baseProvider
        );

        const [name, symbol] = await Promise.all([
          this.retryOperation(() => tokenContract.name()),
          this.retryOperation(() => tokenContract.symbol())
        ]);

        const tx = await this.retryOperation(async () =>
          this.aetheriusBridgeContract.deployWrappedToken(
            token,
            `Wrapped ${name}`,
            `w${symbol}`
          )
        );
        await tx.wait();
        
        wrappedToken = await this.retryOperation(async () =>
          this.aetheriusBridgeContract.wrappedTokens(token)
        );
      }

      // Mint wrapped tokens
      const tx = await this.retryOperation(async () =>
        this.aetheriusBridgeContract.mintWrappedTokens(
          token,
          recipient,
          amount,
          nonce
        )
      );
      await tx.wait();
      
      console.log(`Processed Base -> Aetherius bridge (Nonce: ${nonce})`);
    } catch (error) {
      console.error(`Failed to process Base -> Aetherius bridge (Nonce: ${nonce}):`, error);
      throw error;
    }
  }

  private async processAetheriusToBase(
    token: string,
    amount: bigint,
    recipient: string,
    nonce: bigint
  ) {
    console.log(`Processing Aetherius -> Base bridge (Nonce: ${nonce})`);

    try {
      // Check if already processed
      const processed = await this.retryOperation(async () =>
        this.baseBridgeContract.processedNonces(nonce)
      );
      
      if (processed) {
        console.log(`Nonce ${nonce} already processed`);
        return;
      }

      // Unlock tokens on Base
      const tx = await this.retryOperation(async () =>
        this.baseBridgeContract.unlockTokens(
          token,
          recipient,
          amount,
          nonce
        )
      );
      await tx.wait();
      
      console.log(`Processed Aetherius -> Base bridge (Nonce: ${nonce})`);
    } catch (error) {
      console.error(`Failed to process Aetherius -> Base bridge (Nonce: ${nonce}):`, error);
      throw error;
    }
  }
}
