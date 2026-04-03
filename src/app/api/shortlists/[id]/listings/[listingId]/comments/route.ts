import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; listingId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: shortlistId, listingId } = await params;
  const body = await request.json();
  const { content } = body;

  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const membership = await prisma.shortlistMember.findUnique({
    where: {
      shortlistId_userId: { shortlistId, userId: session.user.id },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const shortlistListing = await prisma.shortlistListing.findUnique({
    where: {
      shortlistId_listingId: { shortlistId, listingId },
    },
  });

  if (!shortlistListing) {
    return NextResponse.json({ error: "Listing not in shortlist" }, { status: 404 });
  }

  const comment = await prisma.comment.create({
    data: {
      shortlistListingId: shortlistListing.id,
      userId: session.user.id,
      content,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
