import type { ConsumeMessage } from 'amqplib';
import { getRabbitMQChannel } from '../rabbitmqClient';
import { getTagsFromOpenAI } from '../../lib/openai';
import { getNeo4jDriver, linkPostToTags } from '../../lib/neo4j';
import { validatePostCreatedMessage } from '../../lib/messageSchemas';

const QUEUE_NAME = 'post_created_queue';
const EXCHANGE_NAME = 'app_events';
const ROUTING_KEY = 'post.created';

async function handlePostCreated(msg: ConsumeMessage | null) {
	if (!msg) {
		console.warn('[post.created] Received null message, skipping.');
		return;
	}

	const channel = await getRabbitMQChannel();
	const content = msg.content.toString();
	console.log('[post.created] Received message');

	try {
		// 1. Validate message structure
		const messageData = validatePostCreatedMessage(content);
		if (!messageData) {
			console.error('[post.created] Invalid message format');
			channel.nack(msg, false, false);
			return;
		}

		// 2. Generate tags using OpenAI
		console.log('[post.created] Generating tags for:', messageData.text.substring(0, 50) + '...');
		const tags = await getTagsFromOpenAI(messageData.text);
		console.log('[post.created] Generated tags:', tags);

		// 3. Store post and tags in Neo4j
		const driver = getNeo4jDriver();
		await linkPostToTags(driver, messageData.postId, messageData.text, tags);

		// 4. Acknowledge the message
		channel.ack(msg);
		console.log(`[post.created] Successfully processed message for post ID: ${messageData.postId}`);
	} catch (error) {
		console.error('[post.created] Error processing message:', error);
		// Nack the message, but don't requeue
		try {
			channel.nack(msg, false, false);
		} catch (nackError) {
			console.error('[post.created] Error nacking message:', nackError);
		}
	}
}

export async function startPostCreatedConsumer() {
	try {
		const channel = await getRabbitMQChannel();
		console.log(`[Consumer][post.created] Asserting queue: ${QUEUE_NAME}`);
		await channel.assertQueue(QUEUE_NAME, { durable: true });
		console.log(`[Consumer][post.created] Binding queue ${QUEUE_NAME} to exchange ${EXCHANGE_NAME} with key ${ROUTING_KEY}`);
		await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);
		await channel.prefetch(1);
		console.log(`[Consumer][post.created] Waiting for messages in ${QUEUE_NAME}. To exit press CTRL+C`);

		channel.consume(QUEUE_NAME,
			(msg) => handlePostCreated(msg),
			{ noAck: false }
		);
	} catch (error) {
		console.error('[Consumer][post.created] Error starting consumer:', error);
		process.exit(1);
	}
} 