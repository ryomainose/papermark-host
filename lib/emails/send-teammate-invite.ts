import TeamInvitation from "@/components/emails/team-invitation";

import { sendEmail } from "@/lib/resend";

export const sendTeammateInviteEmail = async ({
  senderName,
  senderEmail,
  teamName,
  to,
  url,
}: {
  senderName: string;
  senderEmail: string;
  teamName: string;
  to: string;
  url: string;
}) => {
  try {
    console.log("Sending team invitation email with params:", {
      to,
      senderName,
      senderEmail,
      teamName,
      url: url.substring(0, 100) + "...", // Truncate URL for logging
    });
    
    const result = await sendEmail({
      to: to,
      subject: `You are invited to join team`,
      react: TeamInvitation({
        senderName,
        senderEmail,
        teamName,
        url,
      }),
      test: process.env.NODE_ENV === "development",
      system: true,
    });
    
    console.log("Email sent successfully, result:", result);
    return result;
  } catch (e) {
    console.error("Error sending team invitation email:", e);
    throw e; // Re-throw the error so the calling function can handle it
  }
};
