import { Channel, ConsumeMessage } from 'amqplib';
import { getRabbitMQChannel } from '../rabbitmqClient';
import { getNeo4jDriver } from '../../lib/neo4j';
import { validatePostInteractedMessage, type PostInteractedMessage } from '../../lib/messageSchemas';

const QUEUE_NAME = 'post_interacted_queue';
const EXCHANGE_NAME = 'app_events';
const ROUTING_KEY = 'post.interacted';

async function handlePostInteracted(msg: ConsumeMessage | null) {
  if (!msg) {
    console.warn('[Consumer][post.interacted] Received null message');
    return;
  }

  const channel = await getRabbitMQChannel();
  let messageData: PostInteractedMessage | null | undefined;
  const driver = getNeo4jDriver();

  try {
    const messageContentString = msg.content.toString();
    
    // Validate message structure using Zod schema, passing the raw string
    messageData = validatePostInteractedMessage(messageContentString);

    // Check if validation failed (returned null)
    if (!messageData) {
      console.error(`[Consumer][post.interacted] Message validation failed. Nacking message.`);
      channel.nack(msg, false, false); // Nack invalid message
      return; // Stop processing if invalid
    }

    // Define context string here, accessible in subsequent blocks
    const context = `User ${messageData.userId} ${messageData.interactionType} Post ${messageData.postId}`;

    // Destructure AFTER validation confirms messageData is not null
    const { postId, userId, interactionType } = messageData;

    console.log(`[Consumer][post.interacted] Processing event: ${context}`);

    // Store interaction in Neo4j using shared driver
    const session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
    try {
      await session.executeWrite(tx => {
        return tx.run(
          `
          MATCH (u:User {id: $userId})
          MATCH (p:Post {id: $postId})
          MERGE (u)-[r:INTERACTED {type: $interactionType}]->(p)
          ON CREATE SET r.timestamp = datetime()
          RETURN u.id, p.id, r.type
          `,
          { userId: Number(userId), postId: Number(postId), interactionType }
        );
      });
      console.log(`[Consumer][post.interacted] Stored interaction: User ${userId} ${interactionType} Post ${postId}`);
    } finally {
      await session.close();
    }

    // Defensively try to ack the message
    try {
        channel.ack(msg);
        console.log(`[Consumer][post.interacted] Acknowledged message for interaction: ${context}`);
    } catch (ackError: any) {
        console.error(`[Consumer][post.interacted] Failed to ACK message after processing (${context}):`, ackError.message);
    }

  } catch (error: any) {
    // Context defined above is not directly accessible here, 
    // but messageData (which might be null/undefined) is.
    // We need to reconstruct context or use messageData safely.
    const errorContext = messageData 
      ? `User ${messageData.userId} ${messageData.interactionType} Post ${messageData.postId}` 
      : '(unknown - validation failed or error before context definition)';
    console.error(`[Consumer][post.interacted] Error processing message (${errorContext}):`, error.message);
    console.error('Error details:', error);
    try {
        channel.nack(msg, false, false);
        console.log(`[Consumer][post.interacted] Rejected interaction message (${errorContext})`);
    } catch (nackError: any) {
        console.error(`[Consumer][post.interacted] Failed to NACK message after error (${errorContext}):`, nackError.message);
    }
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

    await channel.prefetch(1);

    await channel.consume(QUEUE_NAME, handlePostInteracted, { noAck: false });
    console.log('[Consumer][post.interacted] Consumer started successfully.');

  } catch (error) {
    console.error('[Consumer][post.interacted] Failed to start consumer:', error);
    throw error;
  }
} 