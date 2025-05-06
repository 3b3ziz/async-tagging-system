import { Channel, ConsumeMessage } from 'amqplib';
import { createRabbitMQChannel } from '../rabbitmqClient';
import { getTagsFromOpenAI } from '../../lib/openai';
import { linkPostToTags } from '../../lib/neo4j';
import { validatePostCreatedMessage, PostCreatedMessage } from '../../lib/messageSchemas';
import { EXCHANGE, QUEUES, CONSUMER_OPTIONS } from '../../lib/rabbitmqConfig';

// Simple logger fallback
const logger = {
	info: console.log,
	warn: console.warn,
	error: console.error,
};

// Access the configuration from the centralized config
const { NAME: QUEUE_NAME, ROUTING_KEY, OPTIONS: QUEUE_OPTIONS, PREFETCH } = QUEUES.POST_CREATED;
const EXCHANGE_NAME = EXCHANGE.NAME;

// Accept channel as an argument
export async function initializePostCreatedConsumer(channel: Channel): Promise<void> {
	logger.info(`[Consumer][post.created] Asserting queue: ${QUEUE_NAME}`);
	await channel.assertQueue(QUEUE_NAME, QUEUE_OPTIONS);
	logger.info(`[Consumer][post.created] Binding queue ${QUEUE_NAME} to exchange ${EXCHANGE_NAME} with key ${ROUTING_KEY}`);
	await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

	// Set prefetch count for this consumer's channel
	await channel.prefetch(PREFETCH);

	logger.info(`[Consumer][post.created] Waiting for messages in ${QUEUE_NAME}. To exit press CTRL+C`);

	channel.consume(QUEUE_NAME, async (msg: ConsumeMessage | null) => {
		if (msg) {
			// Pass channel to handler
			await handlePostCreated(msg, channel);
		}
	}, CONSUMER_OPTIONS.DEFAULT); // Use shared consumer options

	logger.info('[Consumer][post.created] Consumer started successfully.');
}

// Accept channel as an argument
async function handlePostCreated(msg: ConsumeMessage, channel: Channel): Promise<void> {
	let postData: PostCreatedMessage | null | undefined = null;
	try {
		const contentString = msg.content.toString();
		postData = validatePostCreatedMessage(contentString);

		if (!postData) {
			logger.error('[post.created] Invalid message format or validation failed.');
			channel.nack(msg, false, false);
			return;
		}

		const postTextPreview = postData.text.substring(0, 50) + '...';
		logger.info(`[post.created] Generating tags for: ${postTextPreview}`);

		const tags = await getTagsFromOpenAI(postData.text);
		logger.info(`[post.created] Generated tags: [ ${tags.join(', ')} ]`);

		if (tags.length > 0) {
			await linkPostToTags(postData.postId, tags);
		}

		channel.ack(msg);
		logger.info(`[post.created] Successfully processed message for post ID: ${postData.postId}`);

	} catch (error: any) {
		const postId = postData?.postId || JSON.parse(msg.content.toString())?.postId || 'unknown';
		logger.error(`[post.created] Error processing message for post ID ${postId}:`, error);
		try {
			channel.nack(msg, false, false);
			logger.warn(`[post.created] Message nacked for post ID ${postId} due to error.`);
		} catch (nackError: any) {
			logger.error(`[post.created] Error nacking message for post ID ${postId}:`, nackError);
		}
	}
} 