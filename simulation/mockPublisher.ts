// jobs/mockPublisher.ts

import { createRabbitMQChannel, closeRabbitMQ } from '../jobs/rabbitmqClient';
import type { PostCreatedMessage, PostInteractedMessage } from '../lib/messageSchemas';
import { EXCHANGE, QUEUES, PUBLISHER_OPTIONS } from '../lib/rabbitmqConfig';
import * as fs from 'fs';
import * as path from 'path';

// Simple logger fallback
const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
};

const EXCHANGE_NAME = EXCHANGE.NAME;
// Routing keys from centralized config
const POST_CREATED_ROUTING_KEY = QUEUES.POST_CREATED.ROUTING_KEY;
const POST_INTERACTED_ROUTING_KEY = QUEUES.POST_INTERACTED.ROUTING_KEY;

// Load mock data from JSON file
function loadMockData() {
  try {
    const dataPath = path.join(__dirname, 'mockData.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    logger.error('[Publisher] Failed to load mock data:', error);
    throw error;
  }
}

async function publishMessage(routingKey: string, content: PostCreatedMessage | PostInteractedMessage) {
  try {
    // Get a dedicated channel for publishing
    const channel = await createRabbitMQChannel();
    
    // Combine default options with timestamp
    const options = {
      ...PUBLISHER_OPTIONS.DEFAULT,
      timestamp: Date.now()
    };
    
    await channel.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(JSON.stringify(content)),
      options
    );
    
    logger.info(`[Publisher] Published message to ${routingKey}:`, content);
    
    // Close the channel after publishing
    await channel.close();
  } catch (error) {
    logger.error(`[Publisher] Failed to publish message to ${routingKey}:`, error);
    throw error;
  }
}

async function runMockPublisher() {
  logger.info('[Publisher] Starting mock publisher...');

  const mockData = loadMockData();
  const now = new Date().toISOString();

  // Publish each post
  for (const post of mockData.posts) {
    const postMessage: PostCreatedMessage = {
      postId: post.id,
      userId: post.userId,
      text: post.text,
      createdAt: now, // Use current time for fresh testing
      metadata: post.metadata
    };
    await publishMessage(POST_CREATED_ROUTING_KEY, postMessage);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait between messages
  }

  // Publish each interaction
  for (const interaction of mockData.interactions) {
    const interactionMessage: PostInteractedMessage = {
      postId: interaction.postId,
      userId: interaction.userId,
      interactionType: interaction.interactionType as any, // Type assertion for compatibility
      createdAt: now // Use current time for fresh testing
    };
    await publishMessage(POST_INTERACTED_ROUTING_KEY, interactionMessage);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait between messages
  }

  logger.info('[Publisher] Finished sending mock messages.');
  await closeRabbitMQ();
}

runMockPublisher().catch(error => {
  logger.error('[Publisher] Error in mock publisher:', error);
  process.exit(1);
}); 