"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
// Load environment variables
const isTestnet = process.env.NETWORK_ENV === 'testnet';
exports.config = {
    validatorPrivateKey: process.env.VALIDATOR_PRIVATE_KEY || '',
    isTestnet,
    networks: {
        base: {
            rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
            contracts: {
                bridge: process.env.BASE_BRIDGE_ADDRESS || '',
                mazu: process.env.BASE_MAZU_ADDRESS || ''
            }
        },
        baseTestnet: {
            rpcUrl: process.env.BASE_TESTNET_RPC_URL || 'https://sepolia.base.org',
            contracts: {
                bridge: process.env.BASE_TESTNET_BRIDGE_ADDRESS || '',
                mazu: process.env.BASE_TESTNET_MAZU_ADDRESS || ''
            }
        },
        aetherius: {
            rpcUrl: process.env.AETHERIUS_RPC_URL || 'https://rpc.ainfinitechain.com',
            contracts: {
                bridge: process.env.AETHERIUS_BRIDGE_ADDRESS || '',
                mazu: process.env.AETHERIUS_MAZU_ADDRESS || ''
            }
        },
        aetheriusTestnet: {
            rpcUrl: process.env.AETHERIUS_TESTNET_RPC_URL || 'https://testnet-rpc.ainfinitechain.com',
            contracts: {
                bridge: process.env.AETHERIUS_TESTNET_BRIDGE_ADDRESS || '',
                mazu: process.env.AETHERIUS_TESTNET_MAZU_ADDRESS || ''
            }
        }
    },
    aiAgent: {
        tokensPerRequest: process.env.AI_AGENT_TOKENS_PER_REQUEST || '1000',
        openaiApiKey: process.env.OPENAI_API_KEY || ''
    }
};
