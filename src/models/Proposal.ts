import mongoose, { Schema, Document } from 'mongoose';

export interface IProposal extends Document {
  proposalId: number;
  proposer: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  votesFor: string;
  votesAgainst: string;
  executed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProposalSchema: Schema = new Schema(
  {
    proposalId: { type: Number, required: true, unique: true },
    proposer: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    votesFor: { type: String, required: true },
    votesAgainst: { type: String, required: true },
    executed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IProposal>('Proposal', ProposalSchema); 