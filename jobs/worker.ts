import { Worker } from 'bullmq';
import { redis } from '../lib/redis';
import { db } from '../db/client';
import { posts } from '../db/schema';
import { openai } from '../lib/openai';
import neo4j from 'neo4j-driver';
import { eq } from 'drizzle-orm';
import { zodResponseFormat } from 'openai/helpers/zod';
import { OpenAITagResponse, TagResponse } from '../lib/schemas';

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASS!)
);

console.log('Starting tag worker...');

const worker = new Worker('tag-post', async (job) => {
  console.log(`Processing job ${job.id} for post ${job.data.postId}...`);
  
  try {
    const { postId } = job.data;
    
    // 1. Fetch post from Postgres
    const [post] = await db.select().from(posts).where(eq(posts.id, postId));
    if (!post) throw new Error(`Post ${postId} not found`);

    // 2. Get tags from OpenAI with structured output
    const completion = await openai.beta.chat.completions.parse({
      messages: [
        { role: "system", content: "Extract exactly 3-5 relevant tags from the given text. Return them in lowercase snake_case format (e.g. machine_learning). Do not return more than 5 tags or fewer than 3 tags." },
        { role: "user", content: post.body },
      ],
      model: "gpt-4o-mini",
      response_format: zodResponseFormat(OpenAITagResponse, "extract_tags"),
    });

    const message = completion.choices[0].message;
    if (message.refusal) {
      throw new Error(`OpenAI refused to process: ${message.refusal}`);
    }

    if (!message.parsed) {
      throw new Error('Failed to parse OpenAI response');
    }

    // Validate that the tags are in snake_case format
    const result = TagResponse.parse(message.parsed);

    // 3. Store in Neo4j
    const session = driver.session();
    await session.writeTransaction((tx) =>
      tx.run(
        `
        MERGE (p:Post {id:$postId})
        WITH p
        UNWIND $tags AS t
          MERGE (tag:Tag {name:t})
          MERGE (p)-[:HAS_TAG]->(tag)
        `,
        { postId, tags: result.extract_tags }
      )
    );
    await session.close();

    console.log(`Post ${postId} tagged with:`, result.extract_tags);
    return { postId, tags: result.extract_tags };
  } catch (error) {
    console.error(`Job ${job.id} failed:`, error);
    throw error;
  }
}, {
  connection: redis,
  concurrency: 1,
  removeOnComplete: {
    age: 3600, // Keep completed jobs for 1 hour
    count: 1000 // Keep last 1000 completed jobs
  },
  removeOnFail: {
    age: 24 * 3600 // Keep failed jobs for 24 hours
  }
});

// Handle worker events
worker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, error) => {
  console.error(`Job ${job?.id} failed:`, error);
});

worker.on('error', (error) => {
  console.error('Worker error:', error);
});

// Graceful shutdown
async function shutdown() {
  console.log('\nShutting down...');
  await worker.close();
  await driver.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Keep the script running
console.log('Worker is ready to process jobs');
setInterval(() => {
  // Worker heartbeat
  process.stdout.write('.');
}, 30000);