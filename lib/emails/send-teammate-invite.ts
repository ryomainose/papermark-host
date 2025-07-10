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
    
    // For testing with free Resend account, override recipient
    const testEmail = process.env.RESEND_TEST_EMAIL || to;
    console.log("RESEND_TEST_EMAIL env var:", process.env.RESEND_TEST_EMAIL);
    console.log("Using email address:", testEmail);
    
    const result = await sendEmail({
      to: testEmail,
      subject: `You are invited to join team`,
      react: TeamInvitation({
        senderName,
        senderEmail,
        teamName,
        url,
      }),
      test: process.env.NODE_ENV === "development" || process.env.RESEND_TEST_MODE === "true",
      system: true,
    });
    
    console.log("Email sent successfully, result:", result);
    return result;
  } catch (e) {
    console.error("Error sending team invitation email:", e);
    throw e; // Re-throw the error so the calling function can handle it
  }
};
