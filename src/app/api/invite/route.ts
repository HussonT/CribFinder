import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Create an invite
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { shortlistId, email } = body;

  const invite = await prisma.invite.create({
    data: {
      senderId: session.user.id,
      shortlistId,
      email,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/invite/${invite.code}`;

  return NextResponse.json({ invite, url: inviteUrl }, { status: 201 });
}

// Accept an invite
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { code } = body;

  const invite = await prisma.invite.findUnique({
    where: { code },
  });

  if (!invite) {
    return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  }

  if (invite.usedById) {
    return NextResponse.json({ error: "Invite already used" }, { status: 400 });
  }

  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 400 });
  }

  // Mark invite as used
  await prisma.invite.update({
    where: { id: invite.id },
    data: { usedById: session.user.id, usedAt: new Date() },
  });

  // Add to shortlist if applicable
  if (invite.shortlistId) {
    await prisma.shortlistMember.upsert({
      where: {
        shortlistId_userId: {
          shortlistId: invite.shortlistId,
          userId: session.user.id,
        },
      },
      update: {},
      create: {
        shortlistId: invite.shortlistId,
        userId: session.user.id,
        role: "MEMBER",
      },
    });
  }

  return NextResponse.json({ success: true, shortlistId: invite.shortlistId });
}
