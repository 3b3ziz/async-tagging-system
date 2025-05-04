import neo4j, { Driver, type Session } from 'neo4j-driver';
import 'dotenv/config';

let driver: Driver | null = null;

const NEO4J_URI = process.env.NEO4J_URI;
const NEO4J_USERNAME = process.env.NEO4J_USERNAME;
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD;
const NEO4J_DATABASE = process.env.NEO4J_DATABASE || 'neo4j'; // Default to 'neo4j' if not set

if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
  console.warn('Neo4j environment variables (NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD) are not fully set. Neo4j client will not be initialized.');
}

export function getNeo4jDriver(): Driver {
  if (!driver) {
    if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
      throw new Error('Cannot create Neo4j driver: Environment variables are missing.');
    }
    try {
      console.log(`Initializing Neo4j driver for URI: ${NEO4J_URI} and database: ${NEO4J_DATABASE}`);
      driver = neo4j.driver(
        NEO4J_URI,
        neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD)
      );
      // Verify connectivity during initialization
      driver.verifyConnectivity({ database: NEO4J_DATABASE })
        .then(() => console.log('Neo4j driver connected successfully.'))
        .catch(error => {
          console.error('Neo4j driver failed to connect:', error);
          // Optional: throw error here or handle reconnection
          driver = null; // Reset driver if connection failed
          throw new Error(`Neo4j connection verification failed: ${error.message}`);
        });
    } catch (error: any) {
      console.error('Failed to initialize Neo4j driver:', error);
      throw new Error(`Neo4j driver initialization failed: ${error.message}`);
    }
  }
  return driver;
}

export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    console.log('Closing Neo4j driver...');
    try {
      await driver.close();
      driver = null;
      console.log('Neo4j driver closed successfully.');
    } catch (error) {
      console.error('Error closing Neo4j driver:', error);
    }
  }
}

/**
 * Creates or merges a Post node and links it to Tag nodes in Neo4j.
 * @param driver The Neo4j driver instance.
 * @param postId The ID of the post.
 * @param postText The text content of the post (optional, for context if needed).
 * @param tags An array of tag strings.
 */
export async function linkPostToTags(
  driver: Driver,
  postId: number | string, // Allow string or number for flexibility
  postText: string, // Keep text for potential future use (e.g., updating Post properties)
  tags: string[]
): Promise<void> {
  const session: Session = driver.session({ database: NEO4J_DATABASE });
  console.log(`[Neo4j] Linking post ID ${postId} to tags: ${tags.join(', ')}`);
  try {
    // Use executeWrite for automatic transaction management and retries
    await session.executeWrite(tx =>
      tx.run(
        `
        MERGE (p:Post {id: $postId})
        ON CREATE SET p.text = $postText // Optionally set text on create
        ON MATCH SET p.text = $postText // Optionally update text on match
        WITH p
        UNWIND $tags AS tagName
          MERGE (t:Tag {name: tagName})
          MERGE (p)-[:HAS_TAG]->(t)
        `,
        {
          postId: typeof postId === 'string' ? parseInt(postId, 10) : postId, // Ensure ID is number if needed by schema
          postText: postText,
          tags: tags,
        }
      )
    );
    console.log(`[Neo4j] Successfully linked post ID ${postId} to tags.`);
  } catch (error) {
    console.error(`[Neo4j] Error linking post ID ${postId} to tags:`, error);
    // Rethrow or handle error as appropriate for the application
    throw error;
  } finally {
    await session.close();
  }
} 