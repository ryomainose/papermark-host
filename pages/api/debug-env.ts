import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Temporarily allow in production for debugging
  // if (process.env.NODE_ENV === "production" && req.headers.authorization !== "debug") {
  //   return res.status(403).json({ error: "Forbidden" });
  // }

  return res.json({
    BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
    papermark_READ_WRITE_TOKEN: !!process.env.papermark_READ_WRITE_TOKEN,
    BLOB_starts_with: process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 15) + "...",
    papermark_starts_with: process.env.papermark_READ_WRITE_TOKEN?.substring(0, 15) + "...",
    NODE_ENV: process.env.NODE_ENV,
  });
}