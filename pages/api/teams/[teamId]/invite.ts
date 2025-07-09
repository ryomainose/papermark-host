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
        res.status(404).json("Team not found");
        return;
      }

      // check that the user is admin of the team, otherwise return 403
      const teamUsers = team.users;
      const isUserAdmin = teamUsers.some(
        (user) =>
          user.role === "ADMIN" &&
          user.userId === (session.user as CustomUser).id,
      );
      if (!isUserAdmin) {
        res.status(403).json("Only admins can send the invitation!");
        return;
      }

      // Check if the user has reached the limit of users in the team
      const limits = await getLimits({
        teamId,
        userId: (session.user as CustomUser).id,
      });

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
        res.status(400).json("Invitation already sent to this email");
        return;
      }

      const token = newId("inv");
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // invitation expires in 24 hour

      // create invitation
      await prisma.invitation.create({
        data: {
          email,
          token,
          expires: expiresAt,
          teamId,
        },
      });

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

      const jwtToken = generateJWT(verifyParamsObject);

      const verifyUrl = `https://papermark-pi-sandy.vercel.app/verify/invitation?token=${jwtToken}`;

      sendTeammateInviteEmail({
        senderName: sender.name || "",
        senderEmail: sender.email || "",
        teamName: team?.name || "",
        to: email,
        url: verifyUrl,
      });

      return res.status(200).json("Invitation sent!");
    } catch (error) {
      errorhandler(error, res);
    }
  }
}
