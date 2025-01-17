import { Router } from 'express';
import { AIAgentService } from '../services/AIAgentService';
import { config } from '../config';

const router = Router();

// Get current configuration
router.get('/config', (req, res) => {
  res.json({
    tokensPerRequest: config.aiAgent.tokensPerRequest
  });
});

// Update tokens per request (admin only)
router.post('/config/update', async (req, res) => {
  try {
    const { tokensPerRequest, adminKey } = req.body;

    // Validate admin key
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate token amount
    if (!tokensPerRequest || isNaN(Number(tokensPerRequest)) || Number(tokensPerRequest) <= 0) {
      return res.status(400).json({ error: 'Invalid token amount' });
    }

    // Update environment variable
    process.env.AI_AGENT_TOKENS_PER_REQUEST = tokensPerRequest.toString();
    
    // Update config
    config.aiAgent.tokensPerRequest = tokensPerRequest.toString();

    res.json({ 
      message: 'Token requirement updated successfully',
      tokensPerRequest: config.aiAgent.tokensPerRequest
    });
  } catch (error) {
    console.error('Config update error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update configuration'
    });
  }
});

// Get user's transaction history
router.get('/transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid address format' });
    }

    const aiAgent = AIAgentService.getInstance();
    const transactions = await aiAgent.getUserTransactions(address);

    res.json(transactions);
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to fetch transactions'
    });
  }
});

// Generate contract
router.post('/generate', async (req, res) => {
  try {
    const { prompt, network, userAddress } = req.body;

    // Validate request body
    if (!prompt || !network || !userAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate network
    const validNetworks = ['base', 'aetherius', 'baseTestnet', 'aetheriusTestnet'];
    if (!validNetworks.includes(network)) {
      return res.status(400).json({ error: 'Invalid network' });
    }

    const aiAgent = AIAgentService.getInstance();
    const result = await aiAgent.generateAndAuditContract({
      prompt,
      network,
      userAddress,
    });

    res.json(result);
  } catch (error) {
    console.error('AI Agent error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate contract'
    });
  }
});

export default router; 