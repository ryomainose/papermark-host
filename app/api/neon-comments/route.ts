import { neon } from '@neondatabase/serverless';
import { NextRequest, NextResponse } from 'next/server';

// Force this route to be dynamic
export const dynamic = 'force-dynamic';

export async function GET() {
  // Check if database URL is configured
  if (!process.env.POSTGRES_PRISMA_URL) {
    return NextResponse.json(
      { error: 'Database URL not configured' },
      { status: 500 }
    );
  }

  try {
    // Connect to the Neon database
    const sql = neon(process.env.POSTGRES_PRISMA_URL);
    
    // Create the table if it doesn't exist first
    await sql(`CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Get all comments
    const comments = await sql('SELECT * FROM comments ORDER BY created_at DESC LIMIT 10');

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Database error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}