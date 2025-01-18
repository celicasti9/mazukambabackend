"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProposalController_1 = __importDefault(require("../controllers/ProposalController"));
const aiAgent_1 = __importDefault(require("./aiAgent"));
const router = (0, express_1.Router)();
router.get('/proposals', ProposalController_1.default.getProposals);
router.get('/proposals/:id', ProposalController_1.default.getProposal);
router.use('/ai-agent', aiAgent_1.default);
exports.default = router;
