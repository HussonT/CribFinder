import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          neighborhood: true,
          price: true,
          images: true,
          sourceUrl: true,
        },
      },
      assignedTo: { select: { id: true, name: true, image: true } },
      messages: {
        orderBy: { sentAt: "desc" },
        take: 1,
      },
      _count: { select: { messages: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(conversations);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { listingId, channel = "EMAIL", subject } = body;

  const conversation = await prisma.conversation.create({
    data: {
      listingId,
      channel,
      subject,
      assignedToId: session.user.id,
    },
    include: {
      listing: true,
      assignedTo: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json(conversation, { status: 201 });
}
