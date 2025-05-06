// jobs/startConsumers.ts
import 'dotenv/config'; // Ensure environment variables are loaded first

import { closeRabbitMQ, createRabbitMQChannel } from './rabbitmqClient'; // Import createRabbitMQChannel
import { closeNeo4jDriver } from '../lib/neo4j'; // Import Neo4j close function
import { initializePostCreatedConsumer } from './consumers/postCreatedConsumer';
import { initializePostInteractedConsumer } from './consumers/postInteractedConsumer';
import { initializeNeo4j } from '../lib/neo4j';
// import { logger } from '../lib/logger'; // Assuming logger exists

let isShuttingDown = false;

// Simple logger fallback
const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
};

// Centralized shutdown function
async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info(`[Main] ${signal} received. Shutting down gracefully...`);
  try {
    // Close connections concurrently
    await Promise.all([
      closeRabbitMQ(),
      closeNeo4jDriver()
    ]);
    logger.info('[Main] All connections closed.');
    process.exit(signal === 'ERROR' ? 1 : 0);
  } catch (error) {
    logger.error('[Main] Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown listeners
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

async function start() {
  logger.info('[Main] Starting consumer services...');

  try {
    // Initialize Neo4j first (or concurrently if safe)
    await initializeNeo4j();

    // Create separate channels for each consumer
    logger.info('[Main] Creating RabbitMQ channel for PostCreatedConsumer...');
    const postCreatedChannel = await createRabbitMQChannel();
    logger.info('[Main] RabbitMQ channel for PostCreatedConsumer created.');

    logger.info('[Main] Creating RabbitMQ channel for PostInteractedConsumer...');
    const postInteractedChannel = await createRabbitMQChannel();
    logger.info('[Main] RabbitMQ channel for PostInteractedConsumer created.');

    // Initialize consumers with their dedicated channels
    await initializePostCreatedConsumer(postCreatedChannel);
    await initializePostInteractedConsumer(postInteractedChannel);

    logger.info('[Main] All consumers started successfully. Waiting for messages...');

  } catch (error) {
    logger.error('[Main] Failed to start consumer services:', error);
    // Attempt cleanup even on startup failure
    await shutdown('ERROR');
    process.exit(1); // Exit with error code
  }
}

start(); // Run the startup function 