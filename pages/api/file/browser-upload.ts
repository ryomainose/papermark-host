import type { NextApiRequest, NextApiResponse } from "next";

import { type HandleUploadBody, handleUpload } from "@vercel/blob/client";
import { getServerSession } from "next-auth/next";

import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

import { authOptions } from "../auth/[...nextauth]";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Log request details to validate assumptions
  console.log('=== Browser Upload Debug ===');
  console.log('Request method:', req.method);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Request body type:', typeof req.body);
  console.log('Request body keys:', req.body ? Object.keys(req.body) : 'no body');
  console.log('BLOB_READ_WRITE_TOKEN exists:', !!process.env.BLOB_READ_WRITE_TOKEN);
  console.log('BLOB_READ_WRITE_TOKEN prefix:', process.env.BLOB_READ_WRITE_TOKEN?.substring(0, 20) || 'NOT_FOUND');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('===============================');

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname: string) => {
        console.log('onBeforeGenerateToken called with pathname:', pathname);
        // Generate a client token for the browser to upload the file

        const session = await getServerSession(req, res, authOptions);
        if (!session) {
          res.status(401).end("Unauthorized");
          throw new Error("Unauthorized");
        }

        const userId = (session.user as CustomUser).id;
        const team = await prisma.team.findFirst({
          where: {
            users: {
              some: {
                userId,
              },
            },
          },
          select: {
            plan: true,
          },
        });

        let maxSize = 30 * 1024 * 1024; // 30 MB
        const stripedTeamPlan = team?.plan.replace("+old", "");
        if (
          stripedTeamPlan &&
          ["business", "datarooms", "datarooms-plus"].includes(stripedTeamPlan)
        ) {
          maxSize = 100 * 1024 * 1024; // 100 MB
        }

        const tokenConfig = {
          allowedContentTypes: [
            "application/pdf",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "text/plain",
            "image/png",
            "image/jpeg",
            "image/gif",
            "image/webp",
          ],
          maximumSizeInBytes: maxSize,
          metadata: JSON.stringify({
            // optional, sent to your server on upload completion
            userId: (session.user as CustomUser).id,
            uploadedAt: new Date().toISOString(),
          }),
        };
        
        console.log('Generated token config:', tokenConfig);
        return tokenConfig;
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // Get notified of browser upload completion
        // ⚠️ This will not work on `localhost` websites,
        // Use ngrok or similar to get the full upload flow

        try {
          // Run any logic after the file upload completed
          // const { userId } = JSON.parse(tokenPayload);
          // await db.update({ avatar: blob.url, userId });
        } catch (error) {
          // throw new Error("Could not update user");
        }
      },
    });

    console.log('handleUpload success, returning response');
    return res.status(200).json(jsonResponse);
  } catch (error) {
    console.error('handleUpload error:', error);
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', (error as Error).message);
    // The webhook will retry 5 times waiting for a 200
    return res.status(400).json({ error: (error as Error).message });
  }
}
