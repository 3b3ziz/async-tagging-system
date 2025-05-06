import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define type for MockPost (can be shared)
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

const loadMockData = () => {
  try {
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
    const { posts } = loadMockData();
    return NextResponse.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch posts';
    return NextResponse.json({ error: 'Failed to fetch posts', message: errorMessage }, { status: 500 });
  }
} 