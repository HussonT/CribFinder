import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { draftOutreachMessage, suggestReply } from "@/lib/ai/messages";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { conversationId, content, aiDrafted = false } = body;

  if (!conversationId || !content) {
    return NextResponse.json(
      { error: "conversationId and content required" },
      { status: 400 }
    );
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      direction: "OUTBOUND",
      content,
      aiDrafted,
      sentById: session.user.id,
    },
  });

  // Update conversation status
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: "WAITING", updatedAt: new Date() },
  });

  return NextResponse.json(message, { status: 201 });
}

// AI draft endpoint
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, listingId, conversationId, tone, intent } = body;

  if (action === "draft_outreach" && listingId) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const draft = await draftOutreachMessage({
      listing,
      userName: session.user.name ?? "Hi",
      tone: tone ?? "friendly",
    });

    return NextResponse.json({ draft });
  }

  if (action === "suggest_reply" && conversationId && intent) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { sentAt: "asc" } },
        listing: true,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const suggestion = await suggestReply(conversation, intent);
    return NextResponse.json({ suggestion });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
