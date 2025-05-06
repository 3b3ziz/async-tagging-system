import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { initializeNeo4j, getNeo4jDriver, closeNeo4jDriver } from '../lib/neo4j';
import 'dotenv/config';

// Define types for our graph data
interface NodeData {
  id: string;
  label: string;
  text: string;
  type: string;
  group: string;
}

interface LinkData {
  source: string;
  target: string;
  label: string;
  type: string;
}

interface MockPost {
  id: string;
  userId: string;
  text: string;
  createdAt: string;
  metadata: {
    language: string;
    source: string;
  };
}

const app = express();
const PORT = process.env.VIEWER_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Load mock data
const loadMockData = () => {
  try {
    const dataPath = path.join(__dirname, '../simulation/mockData.json');
    const rawData = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Failed to load mock data:', error);
    return { posts: [], interactions: [] };
  }
};

// Initialize Neo4j using our shared service
initializeNeo4j();

// API endpoints
app.get('/api/posts', (req, res) => {
  const { posts } = loadMockData();
  res.json(posts);
});

app.get('/api/posts/:id/tags', async (req, res) => {
  const { id } = req.params;
  const driver = getNeo4jDriver();
  const session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
  
  try {
    const result = await session.run(
      `MATCH (p:Post {id: $postId})-[:HAS_TAG]->(t:Tag)
       RETURN t.name AS tag`,
      { postId: id }
    );
    
    const tags = result.records.map(record => record.get('tag'));
    res.json({ postId: id, tags });
  } catch (error) {
    console.error(`Error fetching tags for post ${id}:`, error);
    res.status(500).json({ error: 'Failed to fetch tags', message: error instanceof Error ? error.message : String(error) });
  } finally {
    await session.close();
  }
});

// Endpoint for graph visualization
app.get('/api/graph', async (req, res) => {
  const driver = getNeo4jDriver();
  const session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
  
  // Load mock data to get post text
  const mockData = loadMockData();
  const postsById = new Map<string, MockPost>();
  
  // Index posts by ID for quick lookup
  if (mockData.posts && Array.isArray(mockData.posts)) {
    mockData.posts.forEach((post: MockPost) => {
      postsById.set(post.id, post);
    });
  }
  
  try {
    const result = await session.run(`
      MATCH (p:Post)-[r:HAS_TAG]->(t:Tag)
      RETURN p, t, r
    `);
    
    const nodes: NodeData[] = [];
    const links: LinkData[] = [];
    const nodeMap = new Map<string, NodeData>();
    
    // Process results to extract nodes and relationships
    result.records.forEach(record => {
      const post = record.get('p').properties;
      const tag = record.get('t').properties;
      
      const postId = post.id.toString();
      
      // Add post node if not already added
      if (!nodeMap.has(postId)) {
        // Get text from mockData if available
        const mockPost = postsById.get(postId);
        const postText = mockPost ? mockPost.text : (post.text || 'No text available');
        
        nodeMap.set(postId, {
          id: postId,
          label: postId,
          text: postText,
          type: 'post',
          group: 'post'
        });
        nodes.push(nodeMap.get(postId)!);
      }
      
      // Add tag node if not already added
      if (!nodeMap.has(tag.name)) {
        nodeMap.set(tag.name, {
          id: tag.name,
          label: tag.name,
          text: tag.name,
          type: 'tag',
          group: 'tag'
        });
        nodes.push(nodeMap.get(tag.name)!);
      }
      
      // Add relationship
      links.push({
        source: postId,
        target: tag.name,
        label: 'HAS_TAG',
        type: 'HAS_TAG'
      });
    });
    
    res.json({ nodes, links });
  } catch (error) {
    console.error('Error fetching graph data:', error);
    res.status(500).json({ error: 'Failed to fetch graph data', message: error instanceof Error ? error.message : String(error) });
  } finally {
    await session.close();
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Viewer API server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  // Use the shared closeNeo4jDriver function
  await closeNeo4jDriver();
  process.exit(0);
}); 