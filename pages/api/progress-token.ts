import { NextApiRequest, NextApiResponse } from "next";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { documentVersionId } = req.query;

  if (!documentVersionId || typeof documentVersionId !== "string") {
    return res.status(400).json({ error: "Document version ID is required" });
  }

  try {
    // For development, return a mock token to avoid Trigger.dev dependency
    const mockToken = `dev_token_${documentVersionId}_${Date.now()}`;
    return res.status(200).json({ publicAccessToken: mockToken });
  } catch (error) {
    console.error("Error generating token:", error);
    return res.status(500).json({ error: "Failed to generate token" });
  }
}
