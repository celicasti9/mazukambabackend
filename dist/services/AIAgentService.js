"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIAgentService = void 0;
const openai_1 = __importDefault(require("openai"));
const ethers_1 = require("ethers");
const config_1 = require("../config");
const contracts_1 = require("../constants/contracts");
class AIAgentService {
    constructor() {
        this.openai = new openai_1.default({
            apiKey: config_1.config.aiAgent.openaiApiKey,
        });
    }
    async checkTokenRequirement(account, network) {
        try {
            if (!['base', 'baseTestnet', 'aetherius', 'aetheriusTestnet'].includes(network)) {
                throw new Error(`Invalid network: ${network}`);
            }
            const networkConfig = config_1.config.networks[network];
            if (!networkConfig?.rpcUrl) {
                throw new Error(`No RPC URL configured for network: ${network}`);
            }
            const provider = new ethers_1.ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
            const mazuAddress = contracts_1.MAZU_TOKEN_ADDRESS[network];
            if (!mazuAddress) {
                throw new Error(`No MAZU token address configured for network: ${network}`);
            }
            // Verify the contract exists
            const code = await provider.getCode(mazuAddress);
            if (code === '0x') {
                throw new Error(`No contract found at MAZU token address: ${mazuAddress} on network: ${network}`);
            }
            // Create contract instance
            const mazuContract = new ethers_1.ethers.Contract(mazuAddress, contracts_1.MAZU_ABI, provider);
            try {
                // Get the validator's balance
                const validatorAddress = '0x3C301806E72E67092A280B9cCd38B580D35D0a7B';
                const validatorBalance = await mazuContract.balanceOf(validatorAddress);
                const required = ethers_1.ethers.utils.parseUnits(config_1.config.aiAgent.tokensPerRequest.toString(), 18);
                // Check if the validator has received the tokens
                if (validatorBalance.lt(required)) {
                    throw new Error(`Payment not received. Please ensure you've sent ${config_1.config.aiAgent.tokensPerRequest} MAZU tokens.`);
                }
                return true;
            }
            catch (err) {
                const error = err;
                console.error('Error verifying token payment:', error);
                throw new Error(`Failed to verify token payment: ${error.message}`);
            }
        }
        catch (err) {
            const error = err;
            console.error('Error checking token requirement:', error);
            throw new Error(error.message || 'Failed to verify token balance');
        }
    }
    async generateContract(prompt) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an expert Solidity developer. Generate secure, well-documented smart contracts based on user requirements."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            });
            return response.choices[0]?.message?.content || '';
        }
        catch (error) {
            console.error('Error generating contract:', error);
            throw new Error('Failed to generate contract');
        }
    }
    async auditContract(contract) {
        try {
            const response = await this.openai.chat.completions.create({
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: `You are an expert smart contract security auditor. Analyze the provided contract for security vulnerabilities and best practices.
            Return your response in the following JSON format:
            {
              "score": number (0-100),
              "issues": [
                {
                  "severity": "high" | "medium" | "low",
                  "description": "Detailed description of the issue",
                  "recommendation": "Specific recommendation to fix the issue"
                }
              ]
            }`
                    },
                    {
                        role: "user",
                        content: `Please audit this smart contract and provide a detailed security analysis:\n\n${contract}`
                    }
                ]
            });
            const auditText = response.choices[0]?.message?.content || '';
            try {
                // Parse the JSON response
                const auditReport = JSON.parse(auditText);
                // Validate the structure
                if (typeof auditReport.score !== 'number' || !Array.isArray(auditReport.issues)) {
                    throw new Error('Invalid audit report format');
                }
                return {
                    score: auditReport.score,
                    issues: auditReport.issues.map((issue) => ({
                        severity: issue.severity,
                        description: issue.description,
                        recommendation: issue.recommendation
                    }))
                };
            }
            catch (parseError) {
                console.error('Error parsing audit report:', parseError);
                throw new Error('Failed to parse audit report');
            }
        }
        catch (error) {
            console.error('Error auditing contract:', error);
            throw new Error('Failed to audit contract');
        }
    }
    async generateAndAuditContract(prompt, account, network) {
        const hasEnoughTokens = await this.checkTokenRequirement(account, network);
        if (!hasEnoughTokens) {
            throw new Error(`Insufficient MAZU tokens. Required: ${config_1.config.aiAgent.tokensPerRequest} MAZU`);
        }
        const contract = await this.generateContract(prompt);
        const auditReport = await this.auditContract(contract);
        return {
            contract,
            auditReport
        };
    }
}
exports.AIAgentService = AIAgentService;
