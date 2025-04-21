import { db } from '../db/client';
import { posts, users } from '../db/schema';
import neo4j from 'neo4j-driver';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('Testing PostgreSQL connection...');
    // Test PostgreSQL
    const allPosts = await db.select().from(posts).limit(1);
    console.log('✅ PostgreSQL connection successful');
    console.log('Sample posts:', allPosts);

    console.log('\nTesting Neo4j connection...');
    // Test Neo4j
    const driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASS!)
    );
    
    const session = driver.session();
    try {
      const result = await session.run('MATCH (n) RETURN count(n) as count');
      console.log('✅ Neo4j connection successful');
      console.log('Total nodes:', result.records[0].get('count').toNumber());
    } finally {
      await session.close();
    }
    await driver.close();

  } catch (error) {
    console.error('❌ Error testing connections:', error);
    process.exit(1);
  }
}

main(); 