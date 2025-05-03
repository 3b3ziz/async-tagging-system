// jobs/mockPublisher.ts

import { getRabbitMQChannel, closeRabbitMQ } from './rabbitmqClient';

const EXCHANGE_NAME = 'app_events';

interface PostCreatedEvent {
  postId: number;
  userId: number;
  body: string;
}

interface PostInteractedEvent {
  postId: number;
  userId: number;
  interactionType: 'like' | 'view' | 'comment';
}

async function publishMessage(routingKey: string, message: object) {
  try {
    const channel = await getRabbitMQChannel();
    const messageBuffer = Buffer.from(JSON.stringify(message));

    channel.publish(EXCHANGE_NAME, routingKey, messageBuffer, {
      persistent: true, // Ensure messages survive broker restart
      contentType: 'application/json'
    });

    console.log(`[Publisher] Sent '${routingKey}': ${JSON.stringify(message)}`);
  } catch (error) {
    console.error(`[Publisher] Failed to send message ${routingKey}:`, error);
  }
}

async function runMockPublisher() {
  console.log('[Publisher] Starting mock publisher...');

  // Simulate creating posts
  const post1: PostCreatedEvent = { postId: 101, userId: 1, body: "Exploring RabbitMQ for async communication! #rabbitmq #nodejs" };
  await publishMessage('post.created', post1);
  await new Promise(resolve => setTimeout(resolve, 500)); // Wait 0.5s

  const post2: PostCreatedEvent = { postId: 102, userId: 2, body: "Neo4j graph databases are powerful for connected data. #neo4j #graphdb" };
  await publishMessage('post.created', post2);
  await new Promise(resolve => setTimeout(resolve, 500));

  // Simulate interactions
  const interaction1: PostInteractedEvent = { postId: 101, userId: 2, interactionType: 'like' };
  await publishMessage('post.interacted', interaction1);
  await new Promise(resolve => setTimeout(resolve, 500));

  const interaction2: PostInteractedEvent = { postId: 102, userId: 1, interactionType: 'comment' };
  await publishMessage('post.interacted', interaction2);
  await new Promise(resolve => setTimeout(resolve, 500));

  const interaction3: PostInteractedEvent = { postId: 101, userId: 1, interactionType: 'view' };
  await publishMessage('post.interacted', interaction3);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before closing

  console.log('[Publisher] Finished sending mock messages.');
  await closeRabbitMQ();
}

runMockPublisher().catch(console.error); 