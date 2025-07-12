import prisma from "@/lib/prisma";
import { log } from "@/lib/utils";
import { sendWebhooks } from "@/lib/webhook/send-webhooks";

export async function sendLinkViewWebhook({
  teamId,
  clickData,
}: {
  teamId: string;
  clickData: any;
}) {
  try {
    const {
      view_id: viewId,
      link_id: linkId,
      document_id: documentId,
      dataroom_id: dataroomId,
    } = clickData;

    if (!viewId || !linkId || !teamId) {
      throw new Error("Missing required parameters");
    }

    // check if team is on paid plan
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { plan: true },
    });

    console.log("🚀 Starting webhook send process for team:", teamId, "link:", linkId);
    
    // Temporarily allow webhooks for all plans for testing
    // TODO: Re-enable plan restrictions for production
    // if (
    //   team?.plan === "free" ||
    //   team?.plan === "pro" ||
    //   team?.plan.includes("trial")
    // ) {
    //   // team is not on paid plan, so we don't need to send webhooks
    //   return;
    // }

    // Get webhooks for team
    const webhooks = await prisma.webhook.findMany({
      where: {
        teamId,
        triggers: {
          array_contains: ["link.viewed"],
        },
      },
      select: {
        pId: true,
        url: true,
        secret: true,
      },
    });

    console.log("📋 Found webhooks for team:", webhooks.length, "webhooks");
    if (webhooks.length > 0) {
      console.log("🔗 Webhook URLs:", webhooks.map(w => w.url));
    }

    if (!webhooks || (webhooks && webhooks.length === 0)) {
      console.log("❌ No webhooks found for team, skipping webhook send");
      return;
    }

    // Get link information
    console.log("🔍 Looking for link:", linkId, "in team:", teamId);
    const link = await prisma.link.findUnique({
      where: { id: linkId, teamId },
    });

    if (!link) {
      console.log("❌ Link not found:", linkId);
      throw new Error("Link not found");
    }
    console.log("✅ Link found:", link.name);

    // Prepare link data for webhook
    const linkData = {
      id: link.id,
      url: link.domainId
        ? `https://${link.domainSlug}/${link.slug}`
        : `https://www.papermark.com/view/${link.id}`,
      domain:
        link.domainId && link.domainSlug ? link.domainSlug : "papermark.com",
      key: link.domainId && link.slug ? link.slug : `view/${link.id}`,
      name: link.name,
      expiresAt: link.expiresAt?.toISOString() || null,
      hasPassword: !!link.password,
      allowList: link.allowList,
      denyList: link.denyList,
      enabledEmailProtection: link.emailProtected,
      enabledEmailVerification: link.emailAuthenticated,
      allowDownload: link.allowDownload ?? false,
      isArchived: link.isArchived,
      enabledNotification: link.enableNotification ?? false,
      enabledFeedback: link.enableFeedback ?? false,
      enabledQuestion: link.enableQuestion ?? false,
      enabledScreenshotProtection: link.enableScreenshotProtection ?? false,
      enabledAgreement: link.enableAgreement ?? false,
      enabledWatermark: link.enableWatermark ?? false,
      metaTitle: link.metaTitle,
      metaDescription: link.metaDescription,
      metaImage: link.metaImage,
      metaFavicon: link.metaFavicon,
      documentId: link.documentId,
      dataroomId: link.dataroomId,
      groupId: link.groupId,
      permissionGroupId: link.permissionGroupId,
      linkType: link.linkType,
      teamId: teamId,
      createdAt: link.createdAt.toISOString(),
      updatedAt: link.updatedAt.toISOString(),
    };

    // Get view information
    const view = await prisma.view.findUnique({
      where: { id: viewId, linkId },
      select: {
        id: true,
        viewedAt: true,
        viewerEmail: true,
        verified: true,
      },
    });

    if (!view) {
      throw new Error("View not found");
    }

    // Prepare view data for webhook
    const viewData = {
      viewedAt: view.viewedAt.toISOString(),
      viewId: view.id,
      email: view.viewerEmail,
      emailVerified: view.verified,
      country: clickData.country,
      city: clickData.city,
      device: clickData.device,
      browser: clickData.browser,
      os: clickData.os,
      ua: clickData.ua,
      referer: clickData.referer,
    };

    // Get document and dataroom information for webhook in parallel
    const [document, dataroom] = await Promise.all([
      documentId
        ? prisma.document.findUnique({
            where: { id: documentId, teamId },
            select: {
              id: true,
              name: true,
              contentType: true,
              createdAt: true,
            },
          })
        : null,
      dataroomId
        ? prisma.dataroom.findUnique({
            where: { id: dataroomId, teamId },
            select: { id: true, name: true, createdAt: true },
          })
        : null,
    ]);

    // Prepare webhook payload
    const webhookData = {
      view: viewData,
      link: linkData,
      ...(document && {
        document: {
          id: document.id,
          name: document.name,
          contentType: document.contentType,
          teamId: teamId,
          createdAt: document.createdAt.toISOString(),
        },
      }),
      ...(dataroom && {
        dataroom: {
          id: dataroom.id,
          name: dataroom.name,
          teamId: teamId,
          createdAt: dataroom.createdAt.toISOString(),
        },
      }),
    };

    // Send webhooks
    if (webhooks.length > 0) {
      console.log("✅ Sending webhooks to", webhooks.length, "endpoints");
      await sendWebhooks({
        webhooks,
        trigger: "link.viewed",
        data: webhookData,
      });
      console.log("🎉 Webhooks sent successfully!");
    }
    return;
  } catch (error) {
    console.log("💥 Error in webhook send:", error);
    log({
      message: `Error sending webhooks for link view: ${error}`,
      type: "error",
      mention: true,
    });
    return;
  }
}
