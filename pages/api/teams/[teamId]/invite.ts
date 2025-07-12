import { NextApiRequest, NextApiResponse } from "next";

import { getLimits } from "@/ee/limits/server";
import { getServerSession } from "next-auth";

import { hashToken } from "@/lib/api/auth/token";
import { sendTeammateInviteEmail } from "@/lib/emails/send-teammate-invite";
import { errorhandler } from "@/lib/errorHandler";
import { newId } from "@/lib/id-helper";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";
import { generateChecksum } from "@/lib/utils/generate-checksum";
import { generateJWT } from "@/lib/utils/generate-jwt";

import { authOptions } from "../../auth/[...nextauth]";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "POST") {
    // POST /api/teams/:teamId/invite
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauhorized");
    }

    const { teamId } = req.query as { teamId: string };

    const { email } = req.body;

    if (!email) {
      return res.status(400).json("Email is missing in request body");
    }

    try {
      console.log("Starting invitation process for:", { email, teamId });
      
      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
        },
        include: {
          users: {
            select: {
              userId: true,
              role: true,
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!team) {
        console.log("Team not found:", teamId);
        res.status(404).json("Team not found");
        return;
      }
      
      console.log("Team found:", team.id, "with", team.users.length, "users");

      // check that the user is admin of the team, otherwise return 403
      const teamUsers = team.users;
      const isUserAdmin = teamUsers.some(
        (user) =>
          user.role === "ADMIN" &&
          user.userId === (session.user as CustomUser).id,
      );
      if (!isUserAdmin) {
        console.log("User is not admin:", (session.user as CustomUser).id);
        res.status(403).json("Only admins can send the invitation!");
        return;
      }
      
      console.log("User is admin, proceeding with invitation");

      // Check if the user has reached the limit of users in the team
      console.log("Checking limits...");
      const limits = await getLimits({
        teamId,
        userId: (session.user as CustomUser).id,
      });
      console.log("Limits retrieved:", limits);

      if (limits && teamUsers.length >= limits.users) {
        res
          .status(403)
          .json("You have reached the limit of users in your team");
        return;
      }

      // check if user is already in the team
      const isExistingMember = teamUsers?.some(
        (user) => user.user.email === email,
      );

      if (isExistingMember) {
        res.status(400).json("User is already a member of this team");
        return;
      }

      // check if invitation already exists
      const invitationExists = await prisma.invitation.findUnique({
        where: {
          email_teamId: {
            teamId,
            email,
          },
        },
      });

      if (invitationExists) {
        console.log("Invitation already exists for:", email);
        res.status(400).json("Invitation already sent to this email");
        return;
      }
      
      console.log("No existing invitation found, creating new one...");

      const token = newId("inv");
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // invitation expires in 24 hour
      
      console.log("Generated token and expiry:", { token: token.substring(0, 10) + "...", expiresAt });

      // create invitation
      console.log("Creating invitation record...");
      await prisma.invitation.create({
        data: {
          email,
          token,
          expires: expiresAt,
          teamId,
        },
      });

      console.log("Creating verification token...");
      await prisma.verificationToken.create({
        data: {
          token: hashToken(token),
          identifier: email,
          expires: expiresAt,
        },
      });

      // send invite email
      const sender = session.user as CustomUser;

      // invitation acceptance URL
      const invitationUrl = `/api/teams/${teamId}/invitations/accept?token=${token}&email=${email}`;
      const fullInvitationUrl = `https://papermark-pi-sandy.vercel.app${invitationUrl}`;

      // magic link
      const magicLinkParams = new URLSearchParams({
        email,
        token,
        callbackUrl: fullInvitationUrl,
      });

      const magicLink = `https://papermark-pi-sandy.vercel.app/api/auth/callback/email?${magicLinkParams.toString()}`;

      const verifyParams = new URLSearchParams({
        verification_url: magicLink,
        email,
        token,
        teamId,
        type: "invitation",
        expiresAt: expiresAt.toISOString(),
      });

      const verifyParamsObject = Object.fromEntries(verifyParams.entries());

      console.log("Generating JWT with params:", verifyParamsObject);
      const jwtToken = generateJWT(verifyParamsObject);
      console.log("Generated JWT token:", jwtToken ? "SUCCESS" : "FAILED");

      const verifyUrl = `https://papermark-pi-sandy.vercel.app/verify/invitation?token=${jwtToken}`;

      await sendTeammateInviteEmail({
        senderName: sender.name || sender.email || "Unknown",
        senderEmail: sender.email || "",
        teamName: team?.name || "the team",
        to: email,
        url: verifyUrl,
      });
      
      console.log("Email sent successfully to:", email);

      console.log("Invitation process completed successfully");
      return res.status(200).json("Invitation sent!");
    } catch (error) {
      errorhandler(error, res);
    }
  }
}
