import { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth";

import { hashToken } from "@/lib/api/auth/token";
import { sendTeammateInviteEmail } from "@/lib/emails/send-teammate-invite";
import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";
import { generateChecksum } from "@/lib/utils/generate-checksum";
import { generateJWT } from "@/lib/utils/generate-jwt";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "PUT") {
    // PUT /api/teams/:teamId/invitations/resend
    let session;
    try {
      session = await getServerSession(req, res, authOptions);
    } catch (error) {
      console.error("Session error:", error);
      res.status(500).json({ error: "Session error" });
      return;
    }
    
    if (!session) {
      res.status(401).end("Unauhorized");
      return;
    }

    const { teamId } = req.query as { teamId: string };
    const { email } = req.body as { email: string };

    if (!teamId || !email) {
      res.status(400).json({ error: "Missing required parameters" });
      return;
    }

    try {
      console.log("=== RESEND INVITATION START ===");
      console.log("Request params:", { teamId, email });
      console.log("User ID:", (session.user as CustomUser).id);

      // check if currentUser is part of the team with the teamId
      console.log("Checking user team membership...");
      const userTeam = await prisma.userTeam.findFirst({
        where: {
          teamId,
          userId: (session.user as CustomUser).id,
        },
      });
      console.log("User team result:", userTeam);

      if (!userTeam) {
        console.log("User not part of team, returning 403");
        res.status(403).json("You are not part of this team");
        return;
      }

      const isUserAdmin = userTeam.role === "ADMIN";
      console.log("User admin status:", isUserAdmin);
      if (!isUserAdmin) {
        console.log("User not admin, returning 403");
        res.status(403).json("Only admins can resend the invitation!");
        return;
      }

      // get current team
      console.log("Fetching team details...");
      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
        },
        select: {
          name: true,
        },
      });
      console.log("Team details:", team);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // invitation expires in 24 hour

      console.log("Updating invitation for:", email, "in team:", teamId);
      
      // update invitation
      try {
        const invitation = await prisma.invitation.update({
          where: {
            email_teamId: {
              email: email,
              teamId: teamId,
            },
          },
          data: {
            expires: expiresAt,
          },
          select: {
            token: true,
          },
        });
        console.log("Invitation updated successfully, token:", invitation.token.substring(0, 10) + "...");

        console.log("Managing verification token...");
        const verificationTokenRecord = await prisma.verificationToken.findUnique(
          {
            where: { token: hashToken(invitation.token) },
          },
        );

        if (!verificationTokenRecord) {
          console.log("Creating new verification token...");
          await prisma.verificationToken.create({
            data: {
              expires: expiresAt,
              token: hashToken(invitation.token),
              identifier: email,
            },
          });
        } else {
          console.log("Updating existing verification token...");
          await prisma.verificationToken.update({
            where: { token: hashToken(invitation.token) },
            data: {
              expires: expiresAt,
            },
          });
        }

        // send invite email
        const sender = session.user as CustomUser;
        console.log("Sender details:", { name: sender.name, email: sender.email });

        // invitation acceptance URL
        const invitationUrl = `/api/teams/${teamId}/invitations/accept?token=${invitation.token}&email=${email}`;
        const fullInvitationUrl = `https://papermark-pi-sandy.vercel.app${invitationUrl}`;

        // magic link
        const magicLinkParams = new URLSearchParams({
          email,
          token: invitation.token,
          callbackUrl: fullInvitationUrl,
        });

        const magicLink = `https://papermark-pi-sandy.vercel.app/api/auth/callback/email?${magicLinkParams.toString()}`;

        const verifyParams = new URLSearchParams({
          verification_url: magicLink,
          email,
          token: invitation.token,
          teamId,
          type: "invitation",
          expiresAt: expiresAt.toISOString(),
        });

        const verifyParamsObject = Object.fromEntries(verifyParams.entries());

        console.log("Generating JWT with params:", verifyParamsObject);
        let jwtToken;
        let verifyUrl;
        
        try {
          jwtToken = generateJWT(verifyParamsObject);
          console.log("Generated JWT token:", jwtToken ? "SUCCESS" : "FAILED");
          verifyUrl = `https://papermark-pi-sandy.vercel.app/verify/invitation?token=${jwtToken}`;
          console.log("Final verify URL:", verifyUrl.substring(0, 100) + "...");
        } catch (jwtError) {
          console.error("JWT generation failed:", jwtError);
          // Use a simpler URL without JWT if generation fails
          verifyUrl = fullInvitationUrl;
          console.log("Using fallback URL:", verifyUrl);
        }

        console.log("Sending invitation email to:", email);
        
        try {
          await sendTeammateInviteEmail({
            senderName: sender.name || sender.email || "Team Member",
            senderEmail: sender.email || "noreply@papermark.io",
            teamName: team?.name || "the team",
            to: email,
            url: verifyUrl,
          });
          console.log("Email sent successfully to:", email);
        } catch (emailError) {
          console.error("Email sending failed:", emailError);
          // Continue execution even if email fails
        }

        console.log("=== RESEND INVITATION SUCCESS ===");
        res.status(200).json("Invitation sent again!");
        return;

      } catch (invitationError: any) {
        console.error("Invitation update failed:", invitationError);
        if (invitationError?.code === 'P2025') {
          res.status(404).json("Invitation not found for this email");
          return;
        }
        throw invitationError;
      }
    } catch (error) {
      console.error("=== RESEND INVITATION ERROR ===");
      console.error("Resend invitation error:", error);
      console.error("Error details:", {
        message: (error as Error)?.message,
        stack: (error as Error)?.stack,
        teamId,
        email,
      });
      
      // Always return a response to prevent 500 errors
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Failed to resend invitation",
          message: (error as Error)?.message || "Unknown error"
        });
      }
    }
  } else {
    // Method not allowed
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
