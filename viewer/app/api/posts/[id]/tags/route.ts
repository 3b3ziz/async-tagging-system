import { NextResponse } from 'next/server';
import { initializeNeo4j, getNeo4jDriver } from '@shared/neo4j';
import 'dotenv/config';
import type { Record as Neo4jRecord } from 'neo4j-driver';

export async function GET(
  request: Request, 
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
  }

  try {
    initializeNeo4j();
    const driver = getNeo4jDriver();
    const session = driver.session({ database: process.env.NEO4J_DATABASE || 'neo4j' });
    
    let result;
    try {
      result = await session.run(
        `MATCH (p:Post {id: $postId})-[:HAS_TAG]->(t:Tag)
         RETURN t.name AS tag`,
        { postId: id }
      );
    } finally {
      await session.close();
    }
    
    const tags = result.records.map((record: Neo4jRecord) => record.get('tag'));
    return NextResponse.json({ postId: id, tags });
  } catch (error) {
    console.error(`Error fetching tags for post ${id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch tags';
    return NextResponse.json({ error: 'Failed to fetch tags', message: errorMessage }, { status: 500 });
  }
} 