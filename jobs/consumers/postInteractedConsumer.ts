import { Channel, ConsumeMessage } from 'amqplib';
import { getRabbitMQChannel } from '../rabbitmqClient';
import { getNeo4jDriver } from '../../lib/neo4j';

const QUEUE_NAME = 'post_interacted_queue';
const EXCHANGE_NAME = 'app_events';
const ROUTING_KEY = 'post.interacted';

// Define the expected message content structure
interface PostInteractedMessage {
  postId: number;
  userId: number;
  interactionType: 'like' | 'view' | 'comment';
}

async function handlePostInteracted(msg: ConsumeMessage | null) {
  if (!msg) {
    console.warn('[Consumer][post.interacted] Received null message');
    return;
  }

  const channel = await getRabbitMQChannel();
  let messageData: PostInteractedMessage | undefined;
  const driver = getNeo4jDriver();

  try {
    const messageContentString = msg.content.toString();
    messageData = JSON.parse(messageContentString);

    if (!messageData || !messageData.postId || !messageData.userId || !messageData.interactionType) {
      throw new Error('Invalid message content structure');
    }

    const { postId, userId, interactionType } = messageData;
    console.log(`[Consumer][post.interacted] Processing event: User ${userId} ${interactionType} Post ${postId}`);

    // --- Start of interaction logic using shared driver ---
    const session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
    try {
      // New approach: Use the newer transaction API
      await session.executeWrite(tx => {
        return tx.run(
          `
          MATCH (u:User {id: $userId})
          MATCH (p:Post {id: $postId})
          MERGE (u)-[r:INTERACTED {type: $interactionType}]->(p)
          ON CREATE SET r.timestamp = datetime()
          RETURN u.id, p.id, r.type // This RETURN is for Cypher, not the transaction function
          `,
          { userId: Number(userId), postId: Number(postId), interactionType }
        );
      });
      console.log(`[Consumer][post.interacted] Stored interaction: User ${userId} ${interactionType} Post ${postId}`);
    } finally {
      await session.close();
    }
    // --- End of interaction logic ---

    channel.ack(msg);
    console.log(`[Consumer][post.interacted] Acknowledged message for interaction: User ${userId} ${interactionType} Post ${postId}`);

  } catch (error: any) {
    const context = messageData ? `User ${messageData.userId} ${messageData.interactionType} Post ${messageData.postId}` : '(unknown)';
    console.error(`[Consumer][post.interacted] Error processing message (${context}):`, error.message);
    console.error('Error details:', error);
    channel.nack(msg, false, false); // Reject without requeueing
    console.log(`[Consumer][post.interacted] Rejected interaction message (${context})`);
  }
}

export async function startPostInteractedConsumer() {
  try {
    const channel = await getRabbitMQChannel();

    await channel.assertQueue(QUEUE_NAME, {
        durable: true,
    });
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);
    console.log(`[Consumer][post.interacted] Queue '${QUEUE_NAME}' asserted and bound to '${EXCHANGE_NAME}' with key '${ROUTING_KEY}'. Waiting for messages...`);

    await channel.prefetch(5); // Allow processing a few interactions concurrently if desired

    await channel.consume(QUEUE_NAME, handlePostInteracted, { noAck: false });
    console.log('[Consumer][post.interacted] Consumer started successfully.');

  } catch (error) {
    console.error('[Consumer][post.interacted] Failed to start consumer:', error);
    throw error;
  }
} 