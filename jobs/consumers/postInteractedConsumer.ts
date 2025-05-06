import { Channel, ConsumeMessage } from 'amqplib';
import { validatePostInteractedMessage, PostInteractedMessage } from '../../lib/messageSchemas';
import { storeInteraction } from '../../lib/neo4j';
import { EXCHANGE, QUEUES, CONSUMER_OPTIONS } from '../../lib/rabbitmqConfig';
// import { logger } from '../../lib/logger';

// Simple logger fallback
const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
};

// Access the configuration from the centralized config
const { NAME: QUEUE_NAME, ROUTING_KEY, OPTIONS: QUEUE_OPTIONS, PREFETCH } = QUEUES.POST_INTERACTED;
const EXCHANGE_NAME = EXCHANGE.NAME;

// Accept channel as an argument
export async function initializePostInteractedConsumer(channel: Channel): Promise<void> {
  await channel.assertQueue(QUEUE_NAME, QUEUE_OPTIONS);
  await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

  // Set prefetch count for this consumer's channel
  await channel.prefetch(PREFETCH);

  logger.info(`[Consumer][post.interacted] Queue '${QUEUE_NAME}' asserted and bound to '${EXCHANGE_NAME}' with key '${ROUTING_KEY}'. Waiting for messages...`);

  channel.consume(QUEUE_NAME, async (msg) => {
    if (msg) {
      // Pass channel to handler
      await handlePostInteracted(msg, channel);
    }
  }, CONSUMER_OPTIONS.DEFAULT); // Use shared consumer options

  logger.info('[Consumer][post.interacted] Consumer started successfully.');
}

// Accept channel as an argument
async function handlePostInteracted(msg: ConsumeMessage, channel: Channel): Promise<void> {
  let interactionData: PostInteractedMessage | null | undefined = null; // Initialize as null
  try {
    const contentString = msg.content.toString();
    // Adjust validation handling: assume it returns data or null/throws
    interactionData = validatePostInteractedMessage(contentString);

    if (!interactionData) { // Check if validation returned null/undefined
      logger.error('[post.interacted] Invalid message format or validation failed.');
      // Reject message and don't requeue (poison pill)
      channel.nack(msg, false, false);
      return;
    }

    // Now interactionData is guaranteed to be valid
    logger.info(`[Consumer][post.interacted] Processing event: User ${interactionData.userId} ${interactionData.interactionType} Post ${interactionData.postId}`);

    await storeInteraction(interactionData.userId, interactionData.postId, interactionData.interactionType);
    logger.info(`[Consumer][post.interacted] Stored interaction: User ${interactionData.userId} ${interactionData.interactionType} Post ${interactionData.postId}`);

    // Acknowledge the message *using the passed-in channel*
    channel.ack(msg);
    logger.info(`[Consumer][post.interacted] Acknowledged message for interaction: User ${interactionData.userId} ${interactionData.interactionType} Post ${interactionData.postId}`);

  } catch (error: any) {
    // Log error context, checking if interactionData was populated before error
    const userId = interactionData?.userId || 'unknown';
    const postId = interactionData?.postId || 'unknown';
    const type = interactionData?.interactionType || 'unknown';
    logger.error(`[post.interacted] Error processing interaction message (User ${userId} ${type} Post ${postId}):`, error);
    // Reject message and don't requeue on error
    try {
      channel.nack(msg, false, false);
      logger.warn('[post.interacted] Message nacked due to error.');
    } catch (nackError: any) {
      logger.error('[post.interacted] Error nacking message:', nackError);
    }
  }
} 