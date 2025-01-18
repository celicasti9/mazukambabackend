import { Router } from 'express';
import { config } from '../config';
import { AIAgentService } from '../services/AIAgentService';

const router = Router();
const aiAgent = new AIAgentService();

router.get('/token-requirement', (req, res) => {
  res.json({
    ETH: {
      amount: '0.0016',
      symbol: 'ETH'
    },
    MAZU: {
      amount: '1000',
      symbol: 'MAZU'
    },
    AIC: {
      amount: '2100000',
      symbol: 'AIC'
    }
  });
});

router.post('/generate', async (req, res) => {
  try {
    const { prompt, account, network, paymentMethod } = req.body;
    
    if (!prompt || !account || !network || !paymentMethod) {
      return res.status(400).json({ 
        error: 'Missing required fields: prompt, account, network, and paymentMethod are required' 
      });
    }

    if (!account.match(/^0x[a-fA-F0-9]{40}$/)) {
      return res.status(400).json({ error: 'Invalid account address format' });
    }

    if (!['base', 'baseTestnet', 'aetherius', 'aetheriusTestnet'].includes(network)) {
      return res.status(400).json({ 
        error: 'Invalid network. Must be one of: base, baseTestnet, aetherius, aetheriusTestnet' 
      });
    }

    if (!['ETH', 'MAZU', 'AIC'].includes(paymentMethod)) {
      return res.status(400).json({ 
        error: 'Invalid payment method. Must be one of: ETH, MAZU, AIC' 
      });
    }

    const result = await aiAgent.generateAndAuditContract(prompt, account, network, paymentMethod);
    res.json(result);
  } catch (error: any) {
    console.error('Error generating contract:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate contract',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router; 