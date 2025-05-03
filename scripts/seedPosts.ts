import { db } from '../db/client';
import { users, posts } from '../db/schema';
// Using direct RabbitMQ approach for publishing
import amqp from 'amqplib';

async function main() {
  try {
    // Connect to RabbitMQ for direct publishing
    const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    const EXCHANGE_NAME = 'app_events';
    await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
    
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
      "TypeScript + Node = faster iteration than Java, especially for smaller teams.",
      "Async processing needed? Node shines. Event loop handles I/O without blocking.",
      "Neo4j for graph data. Perfect fit for social connections and recommendations.",
      "Drizzle ORM makes SQL feel less verbose. Type safety is a big win.",
      "OpenAI for NLP tasks like tag extraction? Easy integration.",
      "Docker Compose simplifies local dev setup. Spin up DBs easily.",
    ];

    for (const body of demoPosts) {
      const [post] = await db.insert(posts).values({
        userId: 1,
        body
      }).returning();

      // 3. Enqueue tagging job
      console.log(`Publishing post.created event for Post ID: ${post.id}`);
      const message = { postId: post.id, userId: 1, body: post.body };
      channel.publish(
        EXCHANGE_NAME,
        'post.created',
        Buffer.from(JSON.stringify(message)),
        { persistent: true }
      );
      console.log(`Created post ${post.id}`);
    }

    console.log('Seeding complete.');
    
    // Close RabbitMQ connection
    await channel.close();
    await connection.close();

  } finally {
    // 5. Close connections
    await db.$client.end();
  }
}

main().catch(console.error); 