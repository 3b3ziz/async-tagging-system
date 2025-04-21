import { db } from '../db/client';
import { posts } from '../db/schema';
import neo4j from 'neo4j-driver';
import { eq } from 'drizzle-orm';

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASS!)
);

async function main() {
  const session = driver.session();
  const userId = 1;

  // Get recommended post IDs from Neo4j
  const result = await session.run(
    `
    MATCH (u:User {id:$uid})-[:LIKES]->(p1)-[:HAS_TAG]->(t)<-[:HAS_TAG]-(p2)
    WHERE NOT (u)-[:LIKES]->(p2)
    RETURN DISTINCT p2.id LIMIT 20
    `,
    { uid: userId }
  );

  const postIds = result.records.map(record => record.get('p2.id'));
  
  if (postIds.length === 0) {
    console.log('No recommendations found. Try liking some posts first!');
    return;
  }

  // Get full post details from Postgres
  const recommendedPosts = await db.select()
    .from(posts)
    .where(eq(posts.id, postIds[0])); // Just get the first one for demo

  console.log('\nRecommended posts:');
  for (const post of recommendedPosts) {
    console.log(`\nPost ${post.id}:`);
    console.log(post.body);
  }

  await session.close();
  await driver.close();
}

main().catch(console.error); 