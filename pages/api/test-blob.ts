import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  return res.json({
    env_exists: !!process.env.BLOB_READ_WRITE_TOKEN,
    env_prefix: process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 20) || "not found",
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}