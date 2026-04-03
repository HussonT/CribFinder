import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      shortlistListings: {
        include: {
          shortlist: { select: { id: true, name: true } },
        },
      },
      conversations: {
        select: { id: true, status: true, _count: { select: { messages: true } } },
      },
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(listing);
}
