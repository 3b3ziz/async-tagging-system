// jobs/mockPublisher.ts

import { getRabbitMQChannel, closeRabbitMQ } from '../jobs/rabbitmqClient';
import type { PostCreatedMessage, PostInteractedMessage } from '../lib/messageSchemas';
import * as fs from 'fs';
import * as path from 'path';

const EXCHANGE_NAME = 'app_events';

// Load mock data from JSON file
function loadMockData() {
  try {
    const dataPath = path.join(__dirname, 'mockData.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('[Publisher] Failed to load mock data:', error);
    throw error;
  }
}

async function publishMessage(routingKey: string, content: PostCreatedMessage | PostInteractedMessage) {
  try {
    const channel = await getRabbitMQChannel();
    await channel.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(JSON.stringify(content)),
      { 
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now()
      }
    );
    console.log(`[Publisher] Published message to ${routingKey}:`, content);
  } catch (error) {
    console.error(`[Publisher] Failed to publish message to ${routingKey}:`, error);
    throw error;
  }
}

async function runMockPublisher() {
  console.log('[Publisher] Starting mock publisher...');

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
    await publishMessage('post.created', postMessage);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait between messages
  }

  // Publish each interaction
  for (const interaction of mockData.interactions) {
    const interactionMessage: PostInteractedMessage = {
      postId: interaction.postId,
      userId: interaction.userId,
      interactionType: interaction.interactionType,
      createdAt: now // Use current time for fresh testing
    };
    await publishMessage('post.interacted', interactionMessage);
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait between messages
  }

  console.log('[Publisher] Finished sending mock messages.');
  await closeRabbitMQ();
}

runMockPublisher().catch(error => {
  console.error('[Publisher] Error in mock publisher:', error);
  process.exit(1);
}); 