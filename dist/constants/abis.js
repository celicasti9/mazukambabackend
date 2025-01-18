"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.governanceABI = void 0;
exports.governanceABI = [
    "function proposalCount() view returns (uint256)",
    "function getProposal(uint256 _proposalId) view returns (uint256 id, address proposer, string title, string description, uint256 startTime, uint256 endTime, uint256 votesFor, uint256 votesAgainst, bool executed)",
    "function hasVoted(uint256 _proposalId, address _voter) view returns (bool)",
    "function getVotingPower(address _voter) view returns (uint256)",
    "event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, uint256 startTime, uint256 endTime)",
    "event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 votes)",
    "event ProposalExecuted(uint256 indexed proposalId)"
];
