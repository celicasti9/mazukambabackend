import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import ProposalController from './controllers/ProposalController';

// Load environment variables first
dotenv.config();

// Initialize the controller
try {
  ProposalController.initialize();
} catch (error) {
  console.error('Failed to initialize ProposalController:', error);
  process.exit(1);
}

const logger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' })
  ]
});

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', routes);
app.use(errorHandler);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mazukamba';
const PORT = process.env.PORT || 3001;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    
    const syncInterval = setInterval(() => {
      ProposalController.syncProposals()
        .catch((error: Error) => logger.error('Proposal sync failed:', error));
    }, 60000);

    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      clearInterval(syncInterval);
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });
  })
  .catch((error: Error) => {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  });

process.on('unhandledRejection', (error: Error) => {
  logger.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
}); 