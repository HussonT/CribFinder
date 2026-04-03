import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shortlists = await prisma.shortlist.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
      listings: {
        include: {
          listing: true,
          votes: true,
          _count: { select: { comments: true } },
        },
        orderBy: { addedAt: "desc" },
      },
      _count: { select: { listings: true, members: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(shortlists);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const shortlist = await prisma.shortlist.create({
    data: {
      name,
      members: {
        create: {
          userId: session.user.id,
          role: "OWNER",
        },
      },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
  });

  return NextResponse.json(shortlist, { status: 201 });
}
