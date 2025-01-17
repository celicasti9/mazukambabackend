import express from 'express';
import cors from 'cors';
import aiAgentRouter from './api/ai-agent';

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/ai-agent', aiAgentRouter);

export default app; 