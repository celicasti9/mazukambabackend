import { Router } from 'express';
import ProposalController from '../controllers/ProposalController';
import aiAgentRoutes from './aiAgent';

const router = Router();

router.get('/proposals', ProposalController.getProposals);
router.get('/proposals/:id', ProposalController.getProposal);
router.use('/ai-agent', aiAgentRoutes);

export default router; 