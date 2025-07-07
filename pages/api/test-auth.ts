import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Test auth endpoint called');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', req.body);
  
  if (req.method === 'POST') {
    return res.status(200).json({ 
      success: true, 
      method: req.method,
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type']
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}