import OpenAI from 'openai';
import { ethers } from 'ethers';
import { config } from '../config';
import { MAZU_TOKEN_ADDRESS, MAZU_ABI } from '../constants/contracts';

const PAYMENT_REQUIREMENTS = {
  ETH: {
    amount: ethers.utils.parseEther('0.0016'),
    symbol: 'ETH'
  },
  MAZU: {
    amount: ethers.utils.parseEther('1000'),
    symbol: 'MAZU'
  },
  AIC: {
    amount: ethers.utils.parseEther('2100000'),
    symbol: 'AIC'
  }
};

interface GenerationResult {
  contract: string;
  auditReport: {
    score: number;
    issues: Array<{
      severity: 'high' | 'medium' | 'low';
      description: string;
      recommendation: string;
    }>;
  };
}

export class AIAgentService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  private async checkPayment(account: string, network: string, paymentMethod: keyof typeof PAYMENT_REQUIREMENTS): Promise<boolean> {
    try {
      if (!['base', 'baseTestnet', 'aetherius', 'aetheriusTestnet'].includes(network)) {
        throw new Error(`Invalid network: ${network}`);
      }

      const networkConfig = config.networks[network as keyof typeof config.networks];
      if (!networkConfig?.rpcUrl) {
        throw new Error(`No RPC URL configured for network: ${network}`);
      }

      // All payment verification is handled in the frontend
      return true;
    } catch (err) {
      const error = err as Error;
      console.error('Error checking network:', error);
      throw new Error(error.message || 'Failed to verify network');
    }
  }

  private async generateContract(prompt: string): Promise<string> {
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
    } catch (error) {
      console.error('Error generating contract:', error);
      throw new Error('Failed to generate contract');
    }
  }

  private async auditContract(contract: string): Promise<GenerationResult['auditReport']> {
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
          issues: auditReport.issues.map((issue: { severity: string; description: string; recommendation: string; }) => ({
            severity: issue.severity,
            description: issue.description,
            recommendation: issue.recommendation
          }))
        };
      } catch (parseError) {
        console.error('Error parsing audit report:', parseError);
        throw new Error('Failed to parse audit report');
      }
    } catch (error) {
      console.error('Error auditing contract:', error);
      throw new Error('Failed to audit contract');
    }
  }

  async generateAndAuditContract(prompt: string, account: string, network: string, paymentMethod: keyof typeof PAYMENT_REQUIREMENTS): Promise<GenerationResult> {
    const hasValidPayment = await this.checkPayment(account, network, paymentMethod);
    if (!hasValidPayment) {
      throw new Error(`Insufficient ${PAYMENT_REQUIREMENTS[paymentMethod].symbol} balance`);
    }

    const contract = await this.generateContract(prompt);
    const auditReport = await this.auditContract(contract);

    return {
      contract,
      auditReport
    };
  }
} 