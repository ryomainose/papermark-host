import type { NextApiRequest, NextApiResponse } from "next";
import { put } from '@vercel/blob';
import { getServerSession } from "next-auth/next";
import { CustomUser } from "@/lib/types";
import { authOptions } from "./auth/[...nextauth]";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get filename from query
    const filename = Array.isArray(req.query.filename) 
      ? req.query.filename[0] 
      : req.query.filename;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    console.log('=== Server Upload Debug ===');
    console.log('Filename:', filename);
    console.log('BLOB_READ_WRITE_TOKEN exists:', !!process.env.BLOB_READ_WRITE_TOKEN);
    console.log('BLOB_READ_WRITE_TOKEN prefix:', process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 20) || 'NOT_FOUND');
    console.log('===============================');

    // Upload to Vercel Blob using server method
    const blob = await put(filename, req, {
      access: 'public',
    });

    console.log('Server upload success:', blob.url);
    return res.status(200).json(blob);

  } catch (error) {
    console.error('Server upload error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}