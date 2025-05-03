// jobs/startConsumers.ts
import 'dotenv/config'; // Ensure environment variables are loaded first

import { closeRabbitMQ } from './rabbitmqClient'; // Import only closeRabbitMQ for shutdown handling
import { closeNeo4jDriver } from '../lib/neo4j'; // Import Neo4j close function
import { startPostCreatedConsumer } from './consumers/postCreatedConsumer';
import { startPostInteractedConsumer } from './consumers/postInteractedConsumer';

let isShuttingDown = false;

// Centralized shutdown function
async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Main] ${signal} received. Shutting down gracefully...`);
  try {
    // Close connections concurrently
    await Promise.all([
      closeRabbitMQ(),
      closeNeo4jDriver()
    ]);
    console.log('[Main] All connections closed.');
    process.exit(0);
  } catch (error) {
    console.error('[Main] Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown listeners
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function main() {
  console.log('[Main] Starting consumer services...');

  try {
    // Start consumers concurrently
    await Promise.all([
      startPostCreatedConsumer(),
      startPostInteractedConsumer()
    ]);

    console.log('[Main] All consumers started successfully. Waiting for messages...');

    // Note: Removed explicit keep-alive logic as process listeners handle shutdown.

  } catch (error) {
    console.error('[Main] Failed to start consumers:', error);
    // Attempt to close connections on startup failure
    await shutdown('STARTUP_ERROR'); // Use shutdown function for cleanup
  }
}

main(); 