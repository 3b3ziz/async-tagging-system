import { ConsumeMessage } from 'amqplib';
import { getRabbitMQChannel } from '../rabbitmqClient';
import { db } from '../../db/client'; // Adjusted path
import { posts } from '../../db/schema'; // Adjusted path
import { openai } from '../../lib/openai'; // Adjusted path
import { getNeo4jDriver } from '../../lib/neo4j'; // Import shared driver
import { eq } from 'drizzle-orm';
import { zodResponseFormat } from 'openai/helpers/zod';
import { OpenAITagResponse, TagResponse } from '../../lib/schemas'; // Adjusted path

const QUEUE_NAME = 'post_created_queue';
const EXCHANGE_NAME = 'app_events';
const ROUTING_KEY = 'post.created';

// Define the expected message content structure
interface PostCreatedMessage {
  postId: number;
  // Add other fields if they are present in the message, e.g., userId, body
}

async function handlePostCreated(msg: ConsumeMessage | null) {
  if (!msg) {
    console.warn('[Consumer][post.created] Received null message');
    return;
  }

  const channel = await getRabbitMQChannel();
  let postId: number | undefined;
  const driver = getNeo4jDriver(); // Get shared driver instance

  try {
    const messageContentString = msg.content.toString();
    const content: PostCreatedMessage = JSON.parse(messageContentString);
    postId = content.postId;

    if (!postId) {
        throw new Error('Missing postId in message content');
    }

    console.log(`[Consumer][post.created] Processing event for post ID: ${postId}`);

    // --- Start of logic moved from worker.ts ---

    // 1. Fetch post from Postgres
    // Ensure post ID is treated as a number if your schema expects it
    const [post] = await db.select().from(posts).where(eq(posts.id, Number(postId)));
    if (!post) {
        console.warn(`[Consumer][post.created] Post ${postId} not found in DB. Acknowledging message.`);
        channel.ack(msg); // Acknowledge even if post not found to prevent requeue loop
        return;
    }

    // 2. Get tags from OpenAI with structured output
    console.log(`[Consumer][post.created] Fetching tags for post ${postId} from OpenAI...`);
    const completion = await openai.beta.chat.completions.parse({
      messages: [
        { role: "system", content: "Extract exactly 3-5 relevant tags from the given text. Return them in lowercase snake_case format (e.g. machine_learning). Do not return more than 5 tags or fewer than 3 tags." },
        { role: "user", content: post.body },
      ],
      model: "gpt-4o-mini", // Consider making model configurable
      response_format: zodResponseFormat(OpenAITagResponse, "extract_tags"),
    });

    const openAIMessage = completion.choices[0].message;
    if (openAIMessage.refusal) {
      throw new Error(`OpenAI refused to process: ${openAIMessage.refusal}`);
    }
    if (!openAIMessage.parsed) {
      throw new Error('Failed to parse OpenAI response');
    }

    // Validate that the tags are in snake_case format
    const validationResult = TagResponse.parse(openAIMessage.parsed);
    const tags = validationResult.extract_tags;
    console.log(`[Consumer][post.created] OpenAI returned tags for post ${postId}:`, tags);


    // 3. Store in Neo4j using shared driver
    console.log(`[Consumer][post.created] Storing tags for post ${postId} in Neo4j...`);
    const session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
    try {
      // New approach: Use the newer transaction API
      await session.executeWrite(tx => {
        return tx.run(
          `
          MERGE (p:Post {id: $postId})
          WITH p
          UNWIND $tags AS tagName
            MERGE (tag:Tag {name: tagName})
            MERGE (p)-[:HAS_TAG]->(tag)
          `,
          { postId: Number(postId), tags: tags }
        );
      });
      console.log(`[Consumer][post.created] Successfully stored tags for post ${postId} in Neo4j.`);
    } finally {
      await session.close();
    }

    // --- End of logic moved from worker.ts ---

    // Acknowledge the message
    channel.ack(msg);
    console.log(`[Consumer][post.created] Acknowledged message for post ID: ${postId}`);

  } catch (error: any) {
    console.error(`[Consumer][post.created] Error processing message for post ID ${postId ?? '(unknown)'}:`, error.message);
    console.error('Error details:', error);
    // Reject the message and prevent requeueing to avoid poison pills
    // Consider implementing a dead-letter queue strategy instead
    channel.nack(msg, false, false); // nack(message, allUpTo, requeue=false)
    console.log(`[Consumer][post.created] Rejected message for post ID: ${postId ?? '(unknown)'}`);
  }
}

export async function startPostCreatedConsumer() {
  try {
    const channel = await getRabbitMQChannel();

    await channel.assertQueue(QUEUE_NAME, {
        durable: true,
    });
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);
    console.log(`[Consumer][post.created] Queue '${QUEUE_NAME}' asserted and bound to '${EXCHANGE_NAME}' with key '${ROUTING_KEY}'. Waiting for messages...`);

    // Set prefetch count to limit the number of unacknowledged messages
    await channel.prefetch(1); // Process one message at a time

    await channel.consume(QUEUE_NAME, handlePostCreated, {
      noAck: false // Ensure messages are acknowledged/rejected by the handler
    });

    console.log('[Consumer][post.created] Consumer started successfully.');

  } catch (error) {
    console.error('[Consumer][post.created] Failed to start consumer:', error);
    // Optional: Retry logic or graceful exit
    throw error;
  }
} 