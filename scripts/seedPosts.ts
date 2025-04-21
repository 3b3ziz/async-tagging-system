import { db } from '../db/client';
import { users, posts } from '../db/schema';
import { enqueueTag } from '../jobs/producers';
import { tagQueue } from '../jobs/tagQueue';

async function main() {
  try {
    // 1. Upsert User #1
    await db.insert(users).values({
      id: 1,
      handle: 'demo_user'
    }).onConflictDoNothing();

    // 2. Insert demo posts
    const demoPosts = [
      "Just learned about vector databases - mind blown! The ability to search by semantic similarity is incredible. #tech",
      "Building a personal knowledge graph with Neo4j. Love how intuitive the Cypher query language is.",
      "Experimenting with LLMs for automated content tagging. The results are surprisingly accurate!",
      "Redis pub/sub + BullMQ = elegant job processing. Perfect for handling async tasks in Node.",
      "TypeScript + Drizzle ORM is such a nice combo. Type safety all the way down to the database."
    ];

    for (const body of demoPosts) {
      const [post] = await db.insert(posts).values({
        userId: 1,
        body
      }).returning();

      // 3. Enqueue tagging job
      await enqueueTag(post.id);
      console.log(`Created post ${post.id}`);
    }

    // 4. Verify jobs were queued
    const jobCounts = await tagQueue.getJobCounts();
    console.log('\nJob Queue Status:', jobCounts);

  } finally {
    // 5. Close connections
    await db.$client.end();
    await tagQueue.disconnect();
  }
}

main().catch(console.error); 