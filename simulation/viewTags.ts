import * as fs from 'fs';
import * as path from 'path';
import { Driver, auth, driver as createDriver, Record } from 'neo4j-driver';
import 'dotenv/config';

// Load mock data for posts
function loadMockPosts() {
  try {
    const dataPath = path.join(__dirname, 'mockData.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);
    return data.posts;
  } catch (error) {
    console.error('Failed to load mock data:', error);
    throw error;
  }
}

// Initialize Neo4j driver
function initNeo4j(): Driver {
  const neo4jUrl = process.env.NEO4J_URL || 'neo4j://localhost:7687';
  const neo4jUser = process.env.NEO4J_USER || 'neo4j';
  const neo4jPassword = process.env.NEO4J_PASSWORD || 'password';
  const neo4jDatabase = process.env.NEO4J_DATABASE || 'neo4j';

  console.log(`Initializing Neo4j driver for URI: ${neo4jUrl} and database: ${neo4jDatabase}`);
  return createDriver(
    neo4jUrl,
    auth.basic(neo4jUser, neo4jPassword)
  );
}

// Get tags for post
async function getTagsForPost(driver: Driver, postId: string): Promise<string[]> {
  const session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
  try {
    const result = await session.run(
      `MATCH (p:Post {id: $postId})-[:HAS_TAG]->(t:Tag)
       RETURN t.name AS tag`,
      { postId }
    );
    return result.records.map((record: Record) => record.get('tag'));
  } catch (error) {
    console.error(`Error fetching tags for post ${postId}:`, error);
    return [];
  } finally {
    await session.close();
  }
}

async function main() {
  const posts = loadMockPosts();
  const driver = initNeo4j();
  
  console.log('-------------------------');
  console.log('POSTS WITH THEIR TAGS:');
  console.log('-------------------------');
  
  try {
    for (const post of posts) {
      const tags = await getTagsForPost(driver, post.id);
      
      console.log(`\nPost ID: ${post.id}`);
      console.log(`User: ${post.userId}`);
      console.log(`Text: ${post.text}`);
      
      if (tags.length > 0) {
        console.log(`Tags: ${tags.join(', ')}`);
      } else {
        console.log('Tags: None found');
      }
      console.log('-------------------------');
    }
  } finally {
    await driver.close();
    console.log('Neo4j driver closed.');
  }
}

main().catch(error => {
  console.error('Error in viewTags script:', error);
  process.exit(1);
}); 