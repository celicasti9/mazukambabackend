import { 
  Contract, 
  Wallet, 
  providers,
  utils
} from 'ethers';
import { config } from '../config/index';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const BASE_BRIDGE_ABI = [
  "event TokensLocked(address indexed token, address indexed sender, uint256 amount, address indexed recipient, uint256 nonce)",
  "function unlockTokens(address token, uint256 amount, address recipient, uint256 nonce, bytes memory signature) external",
  "function processedNonces(uint256) external view returns (bool)"
];

const AETHERIUS_BRIDGE_ABI = [
  "event TokensBurned(address indexed token, address indexed sender, uint256 amount, address indexed recipient, uint256 nonce)",
  "function deployWrappedToken(string memory name, string memory symbol, uint8 decimals, address baseToken) external returns (address)",
  "function mintWrappedTokens(address baseToken, uint256 amount, address recipient, uint256 nonce, bytes memory signature) external",
  "function getWrappedToken(address baseToken) external view returns (address)",
  "function processedNonces(uint256) external view returns (bool)"
];

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

export class ValidatorService {
  private baseProvider: providers.JsonRpcProvider;
  private aetheriusProvider: providers.JsonRpcProvider;
  private validatorWallet: Wallet;
  private baseBridgeContract: Contract;
  private aetheriusBridgeContract: Contract;

  constructor() {
    // Initialize providers
    this.baseProvider = new providers.JsonRpcProvider(config.networks.base.rpcUrl);
    this.aetheriusProvider = new providers.JsonRpcProvider(config.networks.aetherius.rpcUrl);

    // Initialize validator wallet
    this.validatorWallet = new Wallet(config.validatorPrivateKey);

    // Initialize contracts
    this.baseBridgeContract = new Contract(
      config.networks.base.contracts.bridge,
      BASE_BRIDGE_ABI,
      this.validatorWallet.connect(this.baseProvider)
    );

    this.aetheriusBridgeContract = new Contract(
      config.networks.aetherius.contracts.bridge,
      AETHERIUS_BRIDGE_ABI,
      this.validatorWallet.connect(this.aetheriusProvider)
    );
  }

  public async start() {
    console.log('Starting validator service...');
    this.listenToBaseEvents();
    this.listenToAetheriusEvents();
  }

  private listenToBaseEvents() {
    this.baseBridgeContract.on('TokensLocked', async (token, sender, amount, recipient, nonce) => {
      console.log(`Tokens locked on Base. Nonce: ${nonce}`);
      
      try {
        // Check if nonce was already processed
        const processed = await this.aetheriusBridgeContract.processedNonces(nonce);
        if (processed) {
          console.log(`Nonce ${nonce} already processed`);
          return;
        }

        // Check if wrapped token exists, if not deploy it
        let wrappedToken = await this.aetheriusBridgeContract.getWrappedToken(token);
        if (wrappedToken === ZERO_ADDRESS) {
          console.log('Deploying wrapped token...');
          const tokenContract = new Contract(token, ERC20_ABI, this.baseProvider);
          const [name, symbol, decimals] = await Promise.all([
            tokenContract.name(),
            tokenContract.symbol(),
            tokenContract.decimals()
          ]);

          const tx = await this.aetheriusBridgeContract.deployWrappedToken(
            name,
            symbol,
            decimals,
            token
          );
          await tx.wait();
          console.log('Wrapped token deployed');
          
          wrappedToken = await this.aetheriusBridgeContract.getWrappedToken(token);
        }

        // Create signature for minting
        const signature = await this.createSignature(token, amount, recipient, nonce);

        // Mint wrapped tokens
        const tx = await this.aetheriusBridgeContract.mintWrappedTokens(
          token,
          amount,
          recipient,
          nonce,
          signature
        );
        await tx.wait();
        console.log(`Wrapped tokens minted for nonce ${nonce}`);
      } catch (error) {
        console.error('Error processing Base to Aetherius bridge:', error);
      }
    });
  }

  private listenToAetheriusEvents() {
    this.aetheriusBridgeContract.on('TokensBurned', async (token, sender, amount, recipient, nonce) => {
      console.log(`Tokens burned on Aetherius. Nonce: ${nonce}`);
      
      try {
        // Check if nonce was already processed
        const processed = await this.baseBridgeContract.processedNonces(nonce);
        if (processed) {
          console.log(`Nonce ${nonce} already processed`);
          return;
        }

        // Get original token from wrapped token
        const originalToken = await this.aetheriusBridgeContract.getOriginalToken(token);
        if (originalToken === ZERO_ADDRESS) {
          throw new Error('Original token not found');
        }

        // Create signature for unlocking
        const signature = await this.createSignature(originalToken, amount, recipient, nonce);

        // Unlock original tokens
        const tx = await this.baseBridgeContract.unlockTokens(
          originalToken,
          amount,
          recipient,
          nonce,
          signature
        );
        await tx.wait();
        console.log(`Original tokens unlocked for nonce ${nonce}`);
      } catch (error) {
        console.error('Error processing Aetherius to Base bridge:', error);
      }
    });
  }

  private async createSignature(token: string, amount: string, recipient: string, nonce: number): Promise<string> {
    const messageHash = utils.solidityKeccak256(
      ['address', 'uint256', 'address', 'uint256'],
      [token, amount, recipient, nonce]
    );
    const messageBytes = utils.arrayify(messageHash);
    return await this.validatorWallet.signMessage(messageBytes);
  }
} 