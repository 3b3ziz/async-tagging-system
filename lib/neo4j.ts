import neo4j, { Driver, ManagedTransaction } from 'neo4j-driver';
import 'dotenv/config';

// Simple logger fallback
const logger = {
  info: console.log,
  warn: console.warn,
  error: console.error,
};

let driver: Driver | null = null;

// Export initializeNeo4j
export function initializeNeo4j(): Driver {
  if (driver) {
    return driver;
  }
  const neo4jUrl = process.env.NEO4J_URL || 'neo4j://localhost:7687';
  const neo4jUser = process.env.NEO4J_USER || 'neo4j';
  const neo4jPassword = process.env.NEO4J_PASSWORD || 'password';
  const neo4jDatabase = process.env.NEO4J_DATABASE || 'neo4j';

  logger.info(`Initializing Neo4j driver for URI: ${neo4jUrl} and database: ${neo4jDatabase}`);
  driver = neo4j.driver(
    neo4jUrl,
    neo4j.auth.basic(neo4jUser, neo4jPassword)
  );

  // Verify connection (optional but recommended)
  driver.verifyConnectivity({ database: neo4jDatabase })
    .then(() => {
      logger.info('Neo4j driver connected successfully.');
    })
    .catch((error) => {
      logger.error('Neo4j driver connection failed:', error);
      // Optionally handle error more gracefully, e.g., throw or exit
    });

  return driver;
}

export function getNeo4jDriver(): Driver {
  if (!driver) {
    throw new Error('Neo4j driver has not been initialized. Call initializeNeo4j first.');
  }
  return driver;
}

export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    logger.info('Closing Neo4j driver...');
    await driver.close();
    driver = null; // Reset driver instance
    logger.info('Neo4j driver closed successfully.');
  }
}

// Updated signature: only postId and tags
export async function linkPostToTags(postId: string, tags: string[]): Promise<void> {
  const currentDriver = getNeo4jDriver();
  const session = currentDriver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
  logger.info(`[Neo4j] Linking post ID ${postId} to tags: ${tags.join(', ')}`);

  try {
    await session.executeWrite(async (tx: ManagedTransaction) => {
      // 1. Ensure the Post node exists (or create it)
      await tx.run(
        'MERGE (p:Post {id: $postId}) ON CREATE SET p.text = null', // Set text to null initially or fetch if needed
        { postId }
      );

      // 2. For each tag, ensure the Tag node exists and create the relationship
      for (const tagName of tags) {
        await tx.run(
          `MERGE (t:Tag {name: $tagName})
           WITH t
           MATCH (p:Post {id: $postId})
           MERGE (p)-[:HAS_TAG]->(t)`,
          { tagName, postId }
        );
      }
    });
    logger.info(`[Neo4j] Successfully linked post ID ${postId} to tags.`);
  } catch (error) {
    logger.error(`[Neo4j] Error linking post ${postId} to tags:`, error);
    throw error; // Re-throw the error to be handled by the consumer
  } finally {
    await session.close();
  }
}

// Export storeInteraction
export async function storeInteraction(userId: string, postId: string, interactionType: string): Promise<void> {
  const currentDriver = getNeo4jDriver();
  const session = currentDriver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
  const context = `User ${userId} ${interactionType} Post ${postId}`;
  logger.info(`[Neo4j] Storing interaction: ${context}`);

  try {
    await session.executeWrite(async (tx: ManagedTransaction) => {
      // Ensure User and Post nodes exist before creating the relationship
      await tx.run(
        'MERGE (u:User {id: $userId})', { userId }
      );
      await tx.run(
        'MERGE (p:Post {id: $postId})', { postId }
      );
      // Create the interaction relationship
      await tx.run(
        `
        MATCH (u:User {id: $userId})
        MATCH (p:Post {id: $postId})
        MERGE (u)-[r:INTERACTED {type: $interactionType}]->(p)
        ON CREATE SET r.timestamp = datetime()
        RETURN r
        `,
        { userId, postId, interactionType }
      );
    });
    logger.info(`[Neo4j] Successfully stored interaction: ${context}`);
  } catch (error) {
    logger.error(`[Neo4j] Error storing interaction (${context}):`, error);
    throw error; // Re-throw the error
  } finally {
    await session.close();
  }
} 