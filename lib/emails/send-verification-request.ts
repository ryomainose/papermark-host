import LoginLink from "@/components/emails/verification-link";

import { sendEmail } from "@/lib/resend";

import { generateChecksum } from "../utils/generate-checksum";

export const sendVerificationRequestEmail = async (params: {
  email: string;
  url: string;
}) => {
  const { url, email } = params;
  const checksum = generateChecksum(url);
  const verificationUrlParams = new URLSearchParams({
    verification_url: url,
    checksum,
  });

  // Extract the base URL from the NextAuth verification URL
  const baseUrl = new URL(url).origin;
  const verificationUrl = `${baseUrl}/verify?${verificationUrlParams}`;
  const emailTemplate = LoginLink({ url: verificationUrl });
  try {
    await sendEmail({
      to: email as string,
      subject: "Welcome to Papermark!",
      react: emailTemplate,
      test: process.env.NODE_ENV === "development",
    });
  } catch (e) {
    console.error(e);
  }
};
