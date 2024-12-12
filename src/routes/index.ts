import { Router } from 'express';
import ProposalController from '../controllers/ProposalController';

const router = Router();

router.get('/proposals', ProposalController.getProposals);
router.get('/proposals/:id', ProposalController.getProposal);

export default router; 