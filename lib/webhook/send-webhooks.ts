import { Webhook } from "@prisma/client";

import { qstash } from "@/lib/cron";

import { createWebhookSignature } from "./signature";
import { prepareWebhookPayload } from "./transform";
import { EventDataProps, WebhookPayload, WebhookTrigger } from "./types";

// Send webhooks to multiple webhooks
export const sendWebhooks = async ({
  webhooks,
  trigger,
  data,
}: {
  webhooks: Pick<Webhook, "pId" | "url" | "secret">[];
  trigger: WebhookTrigger;
  data: EventDataProps;
}) => {
  if (webhooks.length === 0) {
    return;
  }

  const payload = prepareWebhookPayload(trigger, data);

  return await Promise.all(
    webhooks.map((webhook) =>
      publishWebhookEventToQStash({ webhook, payload }),
    ),
  );
};

// Publish webhook event to QStash
const publishWebhookEventToQStash = async ({
  webhook,
  payload,
}: {
  webhook: Pick<Webhook, "pId" | "url" | "secret">;
  payload: WebhookPayload;
}) => {
  // TODO: add proper domain like app.papermark.dev in dev
  const callbackUrl = new URL(
    `${process.env.NEXT_PUBLIC_MARKETING_URL}/api/webhooks/callback`,
  );
  callbackUrl.searchParams.append("webhookId", webhook.pId);
  callbackUrl.searchParams.append("eventId", payload.id);
  callbackUrl.searchParams.append("event", payload.event);

  const signature = await createWebhookSignature(webhook.secret, payload);

  // Format payload for Slack webhooks
  let body: any = payload;
  if (webhook.url.includes("slack.com")) {
    // Format for Slack incoming webhooks based on event type
    let text = "";
    
    if (payload.event === "link.viewed" && "link" in payload.data) {
      const linkName = payload.data.link?.name || "Document";
      const viewerEmail = payload.data.view?.email || "Someone";
      const viewedAt = new Date(payload.data.view?.viewedAt).toLocaleString();
      const documentUrl = payload.data.link?.url;
      text = `📄 Document viewed!\n*Document:* ${linkName}\n*Viewer:* ${viewerEmail}\n*Time:* ${viewedAt}\n*URL:* ${documentUrl}`;
    } else if (payload.event === "link.created" && "link" in payload.data) {
      const linkName = payload.data.link?.name || "Document";
      const documentUrl = payload.data.link?.url;
      text = `🔗 New link created!\n*Document:* ${linkName}\n*URL:* ${documentUrl}`;
    } else if (payload.event === "document.created" && "document" in payload.data) {
      const docName = payload.data.document?.name || "Untitled";
      text = `📑 New document uploaded!\n*Name:* ${docName}`;
    } else if (payload.event === "dataroom.created" && "dataroom" in payload.data) {
      const dataroomName = payload.data.dataroom?.name || "Untitled";
      text = `🗂️ New dataroom created!\n*Name:* ${dataroomName}`;
    } else {
      // Fallback for unknown events
      text = `Event: ${payload.event}`;
    }
    
    body = { text };
  }

  const response = await qstash.publishJSON({
    url: webhook.url,
    body: body,
    headers: {
      "X-Papermark-Signature": signature,
      "Upstash-Hide-Headers": "true",
    },
    callback: callbackUrl.href,
    failureCallback: callbackUrl.href,
  });

  if (!response.messageId) {
    console.error("Failed to publish webhook event to QStash", response);
  }

  return response;
};
