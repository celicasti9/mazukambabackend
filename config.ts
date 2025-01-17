export const config = {
  validatorPrivateKey: process.env.VALIDATOR_PRIVATE_KEY || '',
  isTestnet: process.env.NETWORK_ENV === 'testnet',
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
  },
  aiAgent: {
    tokensPerRequest: process.env.AI_AGENT_TOKENS_PER_REQUEST || '1000',
    openaiApiKey: process.env.OPENAI_API_KEY || ''
  }
}; 