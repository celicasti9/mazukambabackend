import { ValidatorService } from './services/ValidatorService';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  // Check if validator private key is set
  if (!process.env.VALIDATOR_PRIVATE_KEY) {
    throw new Error('VALIDATOR_PRIVATE_KEY environment variable is not set');
  }

  // Start validator service
  const validatorService = new ValidatorService();
  await validatorService.start();

  console.log('Validator service is running...');

  // Keep the process running
  process.on('SIGINT', () => {
    console.log('Shutting down validator service...');
    process.exit();
  });
} 