import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: shortlistId } = await params;
  const body = await request.json();
  const { listingId } = body;

  // Verify membership
  const membership = await prisma.shortlistMember.findUnique({
    where: {
      shortlistId_userId: { shortlistId, userId: session.user.id },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const entry = await prisma.shortlistListing.upsert({
    where: {
      shortlistId_listingId: { shortlistId, listingId },
    },
    update: {},
    create: { shortlistId, listingId },
    include: { listing: true },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: shortlistId } = await params;
  const body = await request.json();
  const { listingId, status } = body;

  const membership = await prisma.shortlistMember.findUnique({
    where: {
      shortlistId_userId: { shortlistId, userId: session.user.id },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const updated = await prisma.shortlistListing.update({
    where: {
      shortlistId_listingId: { shortlistId, listingId },
    },
    data: { status },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: shortlistId } = await params;
  const body = await request.json();
  const { listingId } = body;

  const membership = await prisma.shortlistMember.findUnique({
    where: {
      shortlistId_userId: { shortlistId, userId: session.user.id },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  await prisma.shortlistListing.delete({
    where: {
      shortlistId_listingId: { shortlistId, listingId },
    },
  });

  return NextResponse.json({ success: true });
}
