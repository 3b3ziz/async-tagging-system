import * as fs from 'fs';
import * as path from 'path';
import { Driver, Record } from 'neo4j-driver';
import { initializeNeo4j, closeNeo4jDriver } from '../lib/neo4j';
import 'dotenv/config';

// Simple logger fallback
const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
};

// Load mock data for posts
function loadMockPosts() {
  try {
    const dataPath = path.join(__dirname, 'mockData.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    const data = JSON.parse(rawData);
    return data.posts;
  } catch (error) {
    logger.error('Failed to load mock data:', error);
    throw error;
  }
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
    logger.error(`Error fetching tags for post ${postId}:`, error);
    return [];
  } finally {
    await session.close();
  }
}

async function main() {
  const posts = loadMockPosts();
  
  // Use the shared Neo4j initialization
  const driver = initializeNeo4j();
  
  logger.info('-------------------------');
  logger.info('POSTS WITH THEIR TAGS:');
  logger.info('-------------------------');
  
  try {
    for (const post of posts) {
      const tags = await getTagsForPost(driver, post.id);
      
      logger.info(`\nPost ID: ${post.id}`);
      logger.info(`User: ${post.userId}`);
      logger.info(`Text: ${post.text}`);
      
      if (tags.length > 0) {
        logger.info(`Tags: ${tags.join(', ')}`);
      } else {
        logger.info('Tags: None found');
      }
      logger.info('-------------------------');
    }
  } finally {
    // Use the shared closeNeo4jDriver function
    await closeNeo4jDriver();
    logger.info('Neo4j driver closed.');
  }
}

main().catch(error => {
  logger.error('Error in viewTags script:', error);
  process.exit(1);
}); 