import type { NextApiRequest, NextApiResponse } from "next";
import { put } from '@vercel/blob';
import { getServerSession } from "next-auth/next";
import { CustomUser } from "@/lib/types";
import { authOptions } from "../auth/[...nextauth]";

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
    console.log('Request headers:', {
      'content-type': req.headers['content-type'],
      'content-length': req.headers['content-length'],
      'user-agent': req.headers['user-agent']
    });
    console.log('===============================');

    // Get the file content from request body
    const chunks: Buffer[] = [];
    
    return new Promise((resolve) => {
      req.on('data', (chunk) => {
        console.log('Received chunk:', chunk.length, 'bytes');
        chunks.push(chunk);
      });
      req.on('end', async () => {
        try {
          const fileBuffer = Buffer.concat(chunks);
          console.log('=== File Buffer Analysis ===');
          console.log('Total buffer size:', fileBuffer.length);
          console.log('Buffer first 50 bytes:', fileBuffer.subarray(0, 50).toString('hex'));
          console.log('Buffer is empty:', fileBuffer.length === 0);
          console.log('============================');
          
          if (fileBuffer.length === 0) {
            throw new Error('Received empty file buffer');
          }
          
          // Upload to Vercel Blob using simple put method like quickstart
          console.log('Attempting Vercel Blob upload...');
          const blob = await put(filename, fileBuffer, {
            access: 'public',
          });

          console.log('Server upload success:', blob.url);
          console.log('Full blob response:', JSON.stringify(blob, null, 2));
          
          // Ensure response is properly formatted (only use guaranteed properties)
          const responseData = {
            url: blob.url,
            downloadUrl: blob.url,
            pathname: blob.pathname
          };
          
          console.log('Sending response:', JSON.stringify(responseData, null, 2));
          res.status(200).json(responseData);
          resolve(undefined);
        } catch (error) {
          console.error('=== Upload Error Details ===');
          console.error('Error type:', error?.constructor?.name);
          console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
          console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
          console.error('============================');
          
          // Try to provide a more helpful error response
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorResponse = {
            error: errorMessage,
            timestamp: new Date().toISOString(),
            filename: filename
          };
          
          console.log('Sending error response:', JSON.stringify(errorResponse, null, 2));
          res.status(500).json(errorResponse);
          resolve(undefined);
        }
      });
    });

  } catch (error) {
    console.error('Server upload error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}