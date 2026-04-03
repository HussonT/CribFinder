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
  const { value } = body; // 1, -1, or 2 (heart)

  if (![1, -1, 2].includes(value)) {
    return NextResponse.json({ error: "Invalid vote value" }, { status: 400 });
  }

  // Verify membership
  const membership = await prisma.shortlistMember.findUnique({
    where: {
      shortlistId_userId: { shortlistId, userId: session.user.id },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // Find the shortlist listing
  const shortlistListing = await prisma.shortlistListing.findUnique({
    where: {
      shortlistId_listingId: { shortlistId, listingId },
    },
  });

  if (!shortlistListing) {
    return NextResponse.json({ error: "Listing not in shortlist" }, { status: 404 });
  }

  // Upsert the vote
  const vote = await prisma.vote.upsert({
    where: {
      shortlistListingId_userId: {
        shortlistListingId: shortlistListing.id,
        userId: session.user.id,
      },
    },
    update: { value },
    create: {
      shortlistListingId: shortlistListing.id,
      userId: session.user.id,
      value,
    },
  });

  return NextResponse.json(vote);
}
