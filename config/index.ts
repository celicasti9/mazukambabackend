export interface NetworkConfig {
  rpcUrl: string;
  contracts: {
    bridge: string;
    mazu?: string;
  };
}

export interface Networks {
  base: NetworkConfig;
  aetherius: NetworkConfig;
  baseTestnet: NetworkConfig;
  aetheriusTestnet: NetworkConfig;
}

export interface AIAgentConfig {
  tokensPerRequest: string;
  openaiApiKey: string;
  mazuTokenAddress: {
    base: string;
    aetherius: string;
    baseTestnet: string;
    aetheriusTestnet: string;
  };
}

export interface Config {
  validatorPrivateKey: string;
  isTestnet: boolean;
  networks: {
    base: {
      rpcUrl: string;
      contracts: {
        bridge: string;
        mazu: string;
      };
    };
    aetherius: {
      rpcUrl: string;
      contracts: {
        bridge: string;
        mazu: string;
      };
    };
    baseTestnet: {
      rpcUrl: string;
      contracts: {
        bridge: string;
        mazu: string;
      };
    };
    aetheriusTestnet: {
      rpcUrl: string;
      contracts: {
        bridge: string;
        mazu: string;
      };
    };
  };
  aiAgent: AIAgentConfig;
}

export const config: Config = {
  validatorPrivateKey: process.env.VALIDATOR_PRIVATE_KEY || '',
  isTestnet: process.env.NETWORK_ENV === 'testnet',
  aiAgent: {
    tokensPerRequest: process.env.AI_AGENT_TOKENS_PER_REQUEST || '1000',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    mazuTokenAddress: {
      base: process.env.MAZU_TOKEN_ADDRESS_BASE || '',
      aetherius: process.env.MAZU_TOKEN_ADDRESS_AETHERIUS || '',
      baseTestnet: process.env.MAZU_TOKEN_ADDRESS_BASE_TESTNET || '',
      aetheriusTestnet: process.env.MAZU_TOKEN_ADDRESS_AETHERIUS_TESTNET || ''
    }
  },
  networks: {
    base: {
      rpcUrl: process.env.BASE_RPC_URL || '',
      contracts: {
        bridge: process.env.BASE_BRIDGE_CONTRACT || '',
        mazu: process.env.MAZU_TOKEN_ADDRESS_BASE || ''
      }
    },
    aetherius: {
      rpcUrl: process.env.AETHERIUS_RPC_URL || '',
      contracts: {
        bridge: process.env.AETHERIUS_BRIDGE_CONTRACT || '',
        mazu: process.env.MAZU_TOKEN_ADDRESS_AETHERIUS || ''
      }
    },
    baseTestnet: {
      rpcUrl: process.env.BASE_TESTNET_RPC_URL || '',
      contracts: {
        bridge: process.env.BASE_TESTNET_BRIDGE_CONTRACT || '',
        mazu: process.env.MAZU_TOKEN_ADDRESS_BASE_TESTNET || ''
      }
    },
    aetheriusTestnet: {
      rpcUrl: process.env.AETHERIUS_TESTNET_RPC_URL || '',
      contracts: {
        bridge: process.env.AETHERIUS_TESTNET_BRIDGE_CONTRACT || '',
        mazu: process.env.MAZU_TOKEN_ADDRESS_AETHERIUS_TESTNET || ''
      }
    }
  }
}; 