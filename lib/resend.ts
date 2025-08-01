import { JSXElementConstructor, ReactElement } from "react";

import { render } from "@react-email/components";
import { Resend } from "resend";

import { log, nanoid } from "@/lib/utils";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const sendEmail = async ({
  to,
  subject,
  react,
  from,
  marketing,
  system,
  verify,
  test,
  cc,
  replyTo,
  scheduledAt,
  unsubscribeUrl,
}: {
  to: string;
  subject: string;
  react: ReactElement<any, string | JSXElementConstructor<any>>;
  from?: string;
  marketing?: boolean;
  system?: boolean;
  verify?: boolean;
  test?: boolean;
  cc?: string | string[];
  replyTo?: string;
  scheduledAt?: string;
  unsubscribeUrl?: string;
}) => {
  if (!resend) {
    // Log warning and return mock success when resend is not available
    console.warn("Resend not initialized - RESEND_API_KEY not set. Email sending disabled.");
    return {
      id: "mock-email-id",
      from: from || "noreply@papermark.io",
      to,
      subject,
      created_at: new Date().toISOString(),
    };
  }

  const plainText = await render(react, { plainText: true });

  const fromAddress =
    from ??
    (marketing
      ? "Marc from Papermark <onboarding@next-enablers.com>"
      : system
        ? "Papermark <noreply@next-enablers.com>"
        : verify
          ? "Papermark <noreply@next-enablers.com>"
          : !!scheduledAt
            ? "Marc Seitz <onboarding@next-enablers.com>"
            : "Marc from Papermark <onboarding@next-enablers.com>");

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: test ? "delivered@resend.dev" : to,
      cc: cc,
      replyTo: marketing ? "support@next-enablers.com" : replyTo,
      subject,
      react,
      scheduledAt,
      text: plainText,
      headers: {
        "X-Entity-Ref-ID": nanoid(),
        ...(unsubscribeUrl ? { "List-Unsubscribe": unsubscribeUrl } : {}),
      },
    });

    // Check if the email sending operation returned an error and throw it
    if (error) {
      log({
        message: `Resend returned error when sending email: ${error.name} \n\n ${error.message}`,
        type: "error",
        mention: true,
      });
      throw error;
    }

    // If there's no error, return the data
    return data;
  } catch (exception) {
    // Log and rethrow any caught exceptions for upstream handling
    log({
      message: `Unexpected error when sending email: ${exception}`,
      type: "error",
      mention: true,
    });
    throw exception; // Rethrow the caught exception
  }
};
