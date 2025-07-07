import { neon } from '@neondatabase/serverless';
import { redirect } from 'next/navigation';
import CommentsSection from './comments-section';

export default function NeonDemoPage() {
  async function create(formData: FormData) {
    'use server';
    
    if (!process.env.POSTGRES_PRISMA_URL) {
      console.error('Database URL not configured');
      return;
    }
    
    try {
      // Connect to the Neon database
      const sql = neon(process.env.POSTGRES_PRISMA_URL);
      const comment = formData.get('comment');
      
      if (!comment || typeof comment !== 'string') {
        return;
      }
      
      // First, create the table if it doesn't exist
      await sql(`CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Insert the comment from the form into the Postgres database
      await sql('INSERT INTO comments (comment) VALUES ($1)', [comment]);
      
      // Redirect to refresh the page and show the new comment
      redirect('/neon-demo');
    } catch (error) {
      console.error('Database error:', error);
      // Don't throw, just log and continue
    }
  }

  async function getComments() {
    'use server';
    // Connect to the Neon database
    const sql = neon(`${process.env.POSTGRES_PRISMA_URL}`);
    
    // Create the table if it doesn't exist first
    await sql(`CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      comment TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Get all comments
    const comments = await sql('SELECT * FROM comments ORDER BY created_at DESC');
    return comments;
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Neon Database Demo</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Add a Comment</h2>
        <form action={create} className="space-y-4">
          <input 
            type="text" 
            placeholder="Write a comment" 
            name="comment" 
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button 
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Submit
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Comments</h2>
        <CommentsSection />
      </div>
    </div>
  );
}

