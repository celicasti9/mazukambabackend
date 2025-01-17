import OpenAI from 'openai';
import { ethers } from 'ethers';
import { config } from '../config';

interface Transaction {
  id: string;
  timestamp: number;
  prompt: string;
  network: string;
  cost: string;
  txHash: string;
  status: 'success' | 'error';
}

// In-memory storage for transactions (replace with database in production)
const transactionStore = new Map<string, Transaction[]>();

export class AIAgentService {
  private static instance: AIAgentService;
  private openai: OpenAI;
  private readonly MAZU_TOKEN_ADDRESS = '0x...'; // Add MAZU token address

  private constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  public static getInstance(): AIAgentService {
    if (!AIAgentService.instance) {
      AIAgentService.instance = new AIAgentService();
    }
    return AIAgentService.instance;
  }

  private async checkPayment(userAddress: string): Promise<boolean> {
    try {
      const network = config.isTestnet ? 'baseTestnet' : 'base';
      const provider = new ethers.providers.JsonRpcProvider(config.networks[network].rpcUrl);
      const mazuContract = new ethers.Contract(
        this.MAZU_TOKEN_ADDRESS,
        ['function balanceOf(address) view returns (uint256)', 'function transferFrom(address,address,uint256) returns (bool)'],
        provider
      );

      // Check if user has approved enough tokens
      const balance = await mazuContract.balanceOf(userAddress);
      return balance.gte(ethers.utils.parseUnits(config.aiAgent.tokensPerRequest, 18));
    } catch (error) {
      console.error('Error checking payment:', error);
      return false;
    }
  }

  private async recordTransaction(userAddress: string, data: Omit<Transaction, 'id' | 'timestamp'>): Promise<void> {
    const transaction: Transaction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Math.floor(Date.now() / 1000),
      ...data
    };

    const userTransactions = transactionStore.get(userAddress.toLowerCase()) || [];
    userTransactions.unshift(transaction);
    transactionStore.set(userAddress.toLowerCase(), userTransactions.slice(0, 100)); // Keep last 100 transactions
  }

  public async getUserTransactions(address: string): Promise<Transaction[]> {
    return transactionStore.get(address.toLowerCase()) || [];
  }

  public async generateAndAuditContract(request: {
    prompt: string;
    network: string;
    userAddress: string;
  }): Promise<any> {
    const hasPaid = await this.checkPayment(request.userAddress);
    if (!hasPaid) {
      throw new Error('Insufficient MAZU tokens for this request');
    }

    try {
      // Generate the contract
      const code = await this.generateSmartContract(request.prompt);

      // Audit the contract
      const audit = await this.auditSmartContract(code);

      // Calculate gas estimate
      const estimatedGas = this.calculateGasEstimate(code);

      // Generate deployment instructions
      const deploymentInstructions = this.generateDeploymentInstructions(code, request.network);

      // Record successful transaction
      await this.recordTransaction(request.userAddress, {
        prompt: request.prompt,
        network: request.network,
        cost: config.aiAgent.tokensPerRequest,
        txHash: '0x...', // In a real implementation, this would be the actual transaction hash
        status: 'success'
      });

      return {
        code,
        audit,
        deploymentInstructions,
        estimatedGas
      };
    } catch (error) {
      // Record failed transaction
      await this.recordTransaction(request.userAddress, {
        prompt: request.prompt,
        network: request.network,
        cost: config.aiAgent.tokensPerRequest,
        txHash: '0x...', // In a real implementation, this would be the actual transaction hash
        status: 'error'
      });

      throw error;
    }
  }

  private async generateSmartContract(prompt: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert Solidity developer specializing in creating secure and optimized smart contracts. Generate a smart contract based on the user's requirements, following best practices and security standards."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });

    return response.choices[0].message?.content || '';
  }

  private async auditSmartContract(code: string): Promise<any> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a smart contract security auditor. Analyze the provided smart contract for security vulnerabilities, gas optimization issues, and best practice violations. Provide a detailed report with severity levels (high, medium, low) for each issue found."
        },
        {
          role: "user",
          content: `Audit this smart contract:\n\n${code}`
        }
      ]
    });

    const auditText = response.choices[0].message?.content || '';
    
    // Parse the audit response into structured format
    // This is a simplified example - in production, you'd want more sophisticated parsing
    const issues = auditText.split('\n\n').map(issue => {
      const [severity, description, recommendation] = issue.split('\n');
      return {
        severity: severity.toLowerCase().includes('high') ? 'high' : 
                 severity.toLowerCase().includes('medium') ? 'medium' : 'low',
        description: description.replace(/^Description: /, ''),
        recommendation: recommendation.replace(/^Recommendation: /, '')
      };
    });

    // Calculate security score based on issues
    const score = 100 - (
      issues.filter(i => i.severity === 'high').length * 20 +
      issues.filter(i => i.severity === 'medium').length * 10 +
      issues.filter(i => i.severity === 'low').length * 5
    );

    return {
      issues,
      score: Math.max(0, score) // Ensure score doesn't go below 0
    };
  }

  private calculateGasEstimate(code: string): string {
    // Implement gas estimation logic
    return "0";
  }

  private generateDeploymentInstructions(code: string, network: string): string {
    return `
To deploy this contract on ${network}:

1. Install dependencies:
   \`\`\`bash
   npm install hardhat @nomiclabs/hardhat-ethers ethers
   \`\`\`

2. Configure your hardhat.config.js with the ${network} network settings

3. Deploy using:
   \`\`\`bash
   npx hardhat run scripts/deploy.js --network ${network}
   \`\`\`

Make sure to:
- Have enough native tokens for gas
- Test thoroughly on testnet first
- Verify the contract on the block explorer after deployment
`;
  }
} 