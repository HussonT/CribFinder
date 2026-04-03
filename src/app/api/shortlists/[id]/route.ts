import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const shortlist = await prisma.shortlist.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
      listings: {
        include: {
          listing: true,
          votes: true,
          comments: {
            include: {
              user: { select: { id: true, name: true, image: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { addedAt: "desc" },
      },
    },
  });

  if (!shortlist) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Verify membership
  const isMember = shortlist.members.some((m) => m.userId === session.user.id);
  if (!isMember) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  return NextResponse.json(shortlist);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Verify ownership
  const membership = await prisma.shortlistMember.findUnique({
    where: {
      shortlistId_userId: { shortlistId: id, userId: session.user.id },
    },
  });

  if (!membership || membership.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only the owner can delete a shortlist" },
      { status: 403 }
    );
  }

  await prisma.shortlist.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
