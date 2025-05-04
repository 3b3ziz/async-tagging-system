const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const neo4j = require('neo4j-driver');
require('dotenv').config();

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

// Initialize Neo4j driver
const initNeo4j = () => {
  const neo4jUrl = process.env.NEO4J_URL || 'neo4j://localhost:7687';
  const neo4jUser = process.env.NEO4J_USER || 'neo4j';
  const neo4jPassword = process.env.NEO4J_PASSWORD || 'password';
  
  console.log(`Initializing Neo4j driver for URI: ${neo4jUrl}`);
  return neo4j.driver(
    neo4jUrl,
    neo4j.auth.basic(neo4jUser, neo4jPassword)
  );
};

const driver = initNeo4j();

// API endpoints
app.get('/api/posts', (req, res) => {
  const { posts } = loadMockData();
  res.json(posts);
});

app.get('/api/posts/:id/tags', async (req, res) => {
  const { id } = req.params;
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
    res.status(500).json({ error: 'Failed to fetch tags', message: error.message });
  } finally {
    await session.close();
  }
});

// New endpoint for graph visualization
app.get('/api/graph', async (req, res) => {
  const session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
  
  try {
    const result = await session.run(`
      MATCH (p:Post)-[r:HAS_TAG]->(t:Tag)
      RETURN p, t, r
    `);
    
    const nodes = [];
    const links = [];
    const nodeMap = new Map();
    
    // Process results to extract nodes and relationships
    result.records.forEach(record => {
      const post = record.get('p').properties;
      const tag = record.get('t').properties;
      
      // Add post node if not already added
      if (!nodeMap.has(post.id)) {
        nodeMap.set(post.id, {
          id: post.id,
          label: post.id,
          text: post.text,
          type: 'post',
          group: 'post'
        });
        nodes.push(nodeMap.get(post.id));
      }
      
      // Add tag node if not already added
      if (!nodeMap.has(tag.name)) {
        nodeMap.set(tag.name, {
          id: tag.name,
          label: tag.name,
          type: 'tag',
          group: 'tag'
        });
        nodes.push(nodeMap.get(tag.name));
      }
      
      // Add relationship
      links.push({
        source: post.id,
        target: tag.name,
        label: 'HAS_TAG',
        type: 'HAS_TAG'
      });
    });
    
    res.json({ nodes, links });
  } catch (error) {
    console.error('Error fetching graph data:', error);
    res.status(500).json({ error: 'Failed to fetch graph data', message: error.message });
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
  if (driver) {
    await driver.close();
    console.log('Neo4j driver closed.');
  }
  process.exit(0);
}); 