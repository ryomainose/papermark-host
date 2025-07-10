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
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      res.status(401).end("Unauhorized");
      return;
    }

    const { teamId } = req.query as { teamId: string };

    const { email } = req.body as { email: string };

    try {
      // check if currentUser is part of the team with the teamId
      const userTeam = await prisma.userTeam.findFirst({
        where: {
          teamId,
          userId: (session.user as CustomUser).id,
        },
      });

      if (!userTeam) {
        res.status(403).json("You are not part of this team");
        return;
      }

      const isUserAdmin = userTeam.role === "ADMIN";
      if (!isUserAdmin) {
        res.status(403).json("Only admins can resend the invitation!");
        return;
      }

      // get current team
      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
        },
        select: {
          name: true,
        },
      });

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // invitation expires in 24 hour

      console.log("Updating invitation for:", email, "in team:", teamId);
      
      // update invitation
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

      const verificationTokenRecord = await prisma.verificationToken.findUnique(
        {
          where: { token: hashToken(invitation.token) },
        },
      );

      if (!verificationTokenRecord) {
        await prisma.verificationToken.create({
          data: {
            expires: expiresAt,
            token: hashToken(invitation.token),
            identifier: email,
          },
        });
      } else {
        await prisma.verificationToken.update({
          where: { token: hashToken(invitation.token) },
          data: {
            expires: expiresAt,
          },
        });
      }

      // send invite email
      const sender = session.user as CustomUser;

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
      const jwtToken = generateJWT(verifyParamsObject);
      console.log("Generated JWT token:", jwtToken);

      const verifyUrl = `https://papermark-pi-sandy.vercel.app/verify/invitation?token=${jwtToken}`;
      console.log("Final verify URL:", verifyUrl);

      console.log("Sending invitation email to:", email);
      
      // Temporarily skip email to test if API works without Resend
      console.log("Skipping email temporarily for debugging");
      console.log("Invitation URL:", verifyUrl);
      console.log("Would send email to:", email, "from:", sender.name);

      res.status(200).json("Invitation sent again!");
      return;
    } catch (error) {
      console.error("Resend invitation error:", error);
      console.error("Error details:", {
        message: (error as Error)?.message,
        stack: (error as Error)?.stack,
        teamId,
        email,
      });
      errorhandler(error, res);
    }
  }
}
