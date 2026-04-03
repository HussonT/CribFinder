import { anthropic } from "./client";
import type { Listing, Conversation, Message } from "@/lib/db/types";

type MessageTone = "formal" | "friendly" | "brief";

interface DraftOptions {
  listing: Listing;
  userName: string;
  tone?: MessageTone;
  customContext?: string;
}

/**
 * Generate an initial outreach message for a listing.
 */
export async function draftOutreachMessage(
  options: DraftOptions
): Promise<string> {
  const { listing, userName, tone = "friendly", customContext } = options;

  const toneGuide = {
    formal:
      "Write in a professional, polished tone. Use proper salutations and sign-offs.",
    friendly:
      "Write in a warm, personable tone. Be genuine but still professional. Sound like a real person, not a template.",
    brief:
      "Keep it very short — 2-3 sentences max. Get straight to the point.",
  };

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: `You are helping someone reach out about an apartment rental in NYC. Write a first-contact message.

LISTING DETAILS:
- Title: ${listing.title}
- Price: ${listing.price ? `$${listing.price / 100}/month` : "Not listed"}
- Location: ${listing.neighborhood ?? listing.address ?? "NYC"}
- Bedrooms: ${listing.bedrooms ?? "Not specified"}
- Bathrooms: ${listing.bathrooms ?? "Not specified"}
${listing.description ? `- Description excerpt: ${listing.description.slice(0, 300)}` : ""}
${listing.contactName ? `- Contact: ${listing.contactName}` : ""}

SENDER: ${userName}

TONE: ${toneGuide[tone]}

${customContext ? `ADDITIONAL CONTEXT: ${customContext}` : ""}

RULES:
- Sound like a real human, not a bot or template
- Express genuine interest in the specific apartment (mention something specific)
- Ask about availability and scheduling a tour
- Don't be pushy or desperate
- Don't lie or exaggerate
- Keep it concise — landlords get tons of messages
- If contact name is known, address them by name

Write ONLY the message body. No subject line, no "Dear..." if tone is friendly/brief.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return text.trim();
}

/**
 * Generate a quick reply suggestion based on conversation context.
 */
export async function suggestReply(
  conversation: Conversation & { messages: Message[]; listing: Listing },
  intent: "schedule_tour" | "ask_questions" | "express_interest" | "decline"
): Promise<string> {
  const intentGuide = {
    schedule_tour: "The user wants to schedule a tour/viewing of the apartment.",
    ask_questions:
      "The user wants to ask follow-up questions about the apartment.",
    express_interest:
      "The user wants to express continued interest and keep the conversation warm.",
    decline: "The user wants to politely decline or pass on this apartment.",
  };

  const messageHistory = conversation.messages
    .slice(-6) // Last 6 messages for context
    .map(
      (m) =>
        `${m.direction === "INBOUND" ? "LANDLORD" : "YOU"}: ${m.content}`
    )
    .join("\n\n");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `You are helping someone respond in an apartment rental conversation in NYC.

APARTMENT: ${conversation.listing.title} - ${conversation.listing.neighborhood ?? "NYC"} - ${conversation.listing.price ? `$${conversation.listing.price / 100}/mo` : ""}

CONVERSATION SO FAR:
${messageHistory}

INTENT: ${intentGuide[intent]}

Write a natural, concise reply. Sound human. Don't over-explain. Match the tone of the conversation.
Write ONLY the reply text.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return text.trim();
}

/**
 * Generate a subject line for email outreach.
 */
export async function generateSubjectLine(listing: Listing): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 60,
    messages: [
      {
        role: "user",
        content: `Write a short, natural email subject line for inquiring about this NYC apartment rental:
- ${listing.title}
- ${listing.neighborhood ?? ""}
- ${listing.bedrooms ? `${listing.bedrooms}BR` : ""}
- ${listing.price ? `$${listing.price / 100}/mo` : ""}

Write ONLY the subject line. No quotes. Be natural, not spammy.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return text.trim();
}
