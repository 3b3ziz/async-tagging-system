import { NextResponse } from 'next/server';
import { initializeNeo4j, getNeo4jDriver } from '@shared/neo4j'; // Use path alias
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Define types for our graph data (can be shared if used elsewhere)
interface NodeData {
  id: string;
  label: string;
  text?: string; // Make text optional as in server.ts
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

// Load mock data
const loadMockData = () => {
  try {
    // Corrected path assuming 'simulation' is at the root of 'my-tagger'
    const dataPath = path.join(process.cwd(), '..', 'simulation', 'mockData.json');
    if (!fs.existsSync(dataPath)) {
      console.warn('mockData.json not found at:', dataPath);
      return { posts: [], interactions: [] };
    }
    const rawData = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(rawData);
  } catch (error) {
    console.error('Failed to load mock data:', error);
    return { posts: [], interactions: [] };
  }
};

export async function GET() {
  try {
    initializeNeo4j();
    const driver = getNeo4jDriver();
    const session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });

    const mockData = loadMockData();
    const postsById = new Map<string, MockPost>();

    console.log('mockData', mockData);

    if (mockData.posts && Array.isArray(mockData.posts)) {
      mockData.posts.forEach((post: MockPost) => {
        postsById.set(post.id, post);
      });
    }

    console.log('postsById', postsById);

    let result;
    try {
      result = await session.run(`
        MATCH (p:Post)-[r:HAS_TAG]->(t:Tag)
        RETURN p, t, r
      `);
    } finally {
      await session.close();
    }

    const nodes: NodeData[] = [];
    const links: LinkData[] = [];
    const nodeMap = new Map<string, NodeData>();

    result.records.forEach(record => {
      const post = record.get('p').properties;
      const tag = record.get('t').properties;
      
      const postId = post.id.toString();
      
      if (!nodeMap.has(postId)) {
        const mockPost = postsById.get(postId);
        const postText = mockPost ? mockPost.text : (post.text || 'No text available');
        
        const postNode = {
          id: postId,
          label: postId, // Or some other identifying property from 'post'
          text: postText,
          type: 'post',
          group: 'post'
        };
        nodeMap.set(postId, postNode);
        nodes.push(postNode);
      }
      
      if (!nodeMap.has(tag.name)) {
        const tagNode = {
          id: tag.name,
          label: tag.name,
          text: tag.name, // Or relevant property for tag text/description
          type: 'tag',
          group: 'tag'
        };
        nodeMap.set(tag.name, tagNode);
        nodes.push(tagNode);
      }
      
      links.push({
        source: postId,
        target: tag.name,
        label: 'HAS_TAG', // Relationship type
        type: 'HAS_TAG'
      });
    });

    return NextResponse.json({ nodes, links });
  } catch (error) {
    console.error('Error fetching graph data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch graph data';
    return NextResponse.json({ error: 'Failed to fetch graph data', message: errorMessage }, { status: 500 });
  }
} 