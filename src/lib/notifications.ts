import { formatPrice } from "./utils";

/**
 * WhatsApp notification service using the WhatsApp Business Cloud API.
 *
 * Setup:
 * 1. Create a Meta Business account
 * 2. Set up WhatsApp Business API
 * 3. Get your Phone Number ID and Access Token
 * 4. Set WHATSAPP_PHONE_ID and WHATSAPP_TOKEN in .env
 */

const WHATSAPP_API = "https://graph.facebook.com/v18.0";
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const TOKEN = process.env.WHATSAPP_TOKEN;

interface WhatsAppMessage {
  to: string; // Phone number with country code, e.g. "12125551234"
  text: string;
}

async function sendWhatsApp(message: WhatsAppMessage): Promise<boolean> {
  if (!PHONE_ID || !TOKEN) {
    console.warn("WhatsApp not configured. Set WHATSAPP_PHONE_ID and WHATSAPP_TOKEN.");
    return false;
  }

  try {
    const response = await fetch(`${WHATSAPP_API}/${PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: message.to,
        type: "text",
        text: { body: message.text },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error("WhatsApp send failed:", error);
    return false;
  }
}

// ─── Notification Templates ──────────────────────────────────────────────────

export async function notifyNewListing(
  phoneNumber: string,
  listing: {
    title: string;
    price?: number | null;
    neighborhood?: string | null;
    bedrooms?: number | null;
    sourceUrl?: string | null;
  }
): Promise<boolean> {
  const price = listing.price ? formatPrice(listing.price) : "Price N/A";
  const beds = listing.bedrooms != null ? `${listing.bedrooms}BR` : "";
  const hood = listing.neighborhood ?? "NYC";

  const text = `🏠 New listing in ${hood}!

${listing.title}
${price} ${beds ? `• ${beds}` : ""}

${listing.sourceUrl ?? ""}`.trim();

  return sendWhatsApp({ to: phoneNumber, text });
}

export async function notifyLandlordReply(
  phoneNumber: string,
  listing: { title: string; neighborhood?: string | null },
  messagePreview: string
): Promise<boolean> {
  const text = `💬 Reply received!

Re: ${listing.title} (${listing.neighborhood ?? "NYC"})

"${messagePreview.slice(0, 200)}"

Open CribFinder to respond →`.trim();

  return sendWhatsApp({ to: phoneNumber, text });
}

export async function notifyFriendActivity(
  phoneNumber: string,
  friendName: string,
  action: string,
  listingTitle: string
): Promise<boolean> {
  const text = `👥 ${friendName} ${action}

"${listingTitle}"

Check it out on CribFinder →`.trim();

  return sendWhatsApp({ to: phoneNumber, text });
}

export async function notifyTourReminder(
  phoneNumber: string,
  listing: { title: string; address?: string | null },
  tourTime: string
): Promise<boolean> {
  const text = `📅 Tour reminder!

${listing.title}
${listing.address ?? ""}
${tourTime}

Good luck! 🤞`.trim();

  return sendWhatsApp({ to: phoneNumber, text });
}
