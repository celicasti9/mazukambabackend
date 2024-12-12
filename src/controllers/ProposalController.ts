import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { AppError } from '../middleware/errorHandler';
import Proposal, { IProposal } from '../models/Proposal';
import { governanceABI } from '../constants/abis';
import { GOVERNANCE_ADDRESS } from '../constants/addresses';

class ProposalController {
  private provider: ethers.providers.JsonRpcProvider | null = null;
  private governanceContract: ethers.Contract | null = null;

  public initialize() {
    if (!process.env.RPC_URL) {
      throw new Error('RPC_URL environment variable is not set');
    }
    
    this.provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
    this.governanceContract = new ethers.Contract(
      GOVERNANCE_ADDRESS,
      governanceABI,
      this.provider
    );
  }

  private ensureInitialized() {
    if (!this.provider || !this.governanceContract) {
      this.initialize();
    }
  }

  public getProposals = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      this.ensureInitialized();
      const proposals: IProposal[] = await Proposal.find().sort({ createdAt: -1 });
      res.json(proposals);
    } catch (error) {
      next(new AppError(500, 'Failed to fetch proposals'));
    }
  };

  public getProposal = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      this.ensureInitialized();
      const proposal = await Proposal.findOne({ proposalId: req.params.id });
      if (!proposal) {
        throw new AppError(404, 'Proposal not found');
      }
      res.json(proposal);
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(500, 'Failed to fetch proposal'));
      }
    }
  };

  public syncProposals = async (): Promise<void> => {
    try {
      this.ensureInitialized();
      if (!this.governanceContract) throw new Error('Contract not initialized');
      
      const proposalCount = await this.governanceContract.proposalCount();
      
      for (let i = 1; i <= proposalCount.toNumber(); i++) {
        const proposalData = await this.governanceContract.getProposal(i);
        
        await Proposal.findOneAndUpdate(
          { proposalId: i },
          {
            proposalId: i,
            proposer: proposalData.proposer,
            title: proposalData.title,
            description: proposalData.description,
            startTime: new Date(proposalData.startTime.toNumber() * 1000),
            endTime: new Date(proposalData.endTime.toNumber() * 1000),
            votesFor: proposalData.votesFor.toString(),
            votesAgainst: proposalData.votesAgainst.toString(),
            executed: proposalData.executed,
          },
          { upsert: true }
        );
      }
    } catch (error) {
      console.error('Failed to sync proposals:', error);
    }
  };
}

export default new ProposalController(); 