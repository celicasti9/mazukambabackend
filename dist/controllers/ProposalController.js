"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
const errorHandler_1 = require("../middleware/errorHandler");
const Proposal_1 = __importDefault(require("../models/Proposal"));
const abis_1 = require("../constants/abis");
const addresses_1 = require("../constants/addresses");
class ProposalController {
    constructor() {
        this.provider = null;
        this.governanceContract = null;
        this.getProposals = async (req, res, next) => {
            try {
                this.ensureInitialized();
                const proposals = await Proposal_1.default.find().sort({ createdAt: -1 });
                res.json(proposals);
            }
            catch (error) {
                next(new errorHandler_1.AppError(500, 'Failed to fetch proposals'));
            }
        };
        this.getProposal = async (req, res, next) => {
            try {
                this.ensureInitialized();
                const proposal = await Proposal_1.default.findOne({ proposalId: req.params.id });
                if (!proposal) {
                    throw new errorHandler_1.AppError(404, 'Proposal not found');
                }
                res.json(proposal);
            }
            catch (error) {
                if (error instanceof errorHandler_1.AppError) {
                    next(error);
                }
                else {
                    next(new errorHandler_1.AppError(500, 'Failed to fetch proposal'));
                }
            }
        };
        this.syncProposals = async () => {
            try {
                this.ensureInitialized();
                if (!this.governanceContract)
                    throw new Error('Contract not initialized');
                const proposalCount = await this.governanceContract.proposalCount();
                for (let i = 1; i <= proposalCount.toNumber(); i++) {
                    const proposalData = await this.governanceContract.getProposal(i);
                    await Proposal_1.default.findOneAndUpdate({ proposalId: i }, {
                        proposalId: i,
                        proposer: proposalData.proposer,
                        title: proposalData.title,
                        description: proposalData.description,
                        startTime: new Date(proposalData.startTime.toNumber() * 1000),
                        endTime: new Date(proposalData.endTime.toNumber() * 1000),
                        votesFor: proposalData.votesFor.toString(),
                        votesAgainst: proposalData.votesAgainst.toString(),
                        executed: proposalData.executed,
                    }, { upsert: true });
                }
            }
            catch (error) {
                console.error('Failed to sync proposals:', error);
            }
        };
    }
    initialize() {
        if (!process.env.RPC_URL) {
            throw new Error('RPC_URL environment variable is not set');
        }
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(process.env.RPC_URL);
        this.governanceContract = new ethers_1.ethers.Contract(addresses_1.GOVERNANCE_ADDRESS, abis_1.governanceABI, this.provider);
    }
    ensureInitialized() {
        if (!this.provider || !this.governanceContract) {
            this.initialize();
        }
    }
}
exports.default = new ProposalController();
