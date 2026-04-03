import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      searchPreferences: true,
      phone: true,
      whatsappId: true,
    },
  });

  return NextResponse.json(user);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { searchPreferences, phone, whatsappId } = body;

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(searchPreferences !== undefined && {
        searchPreferences: searchPreferences as object,
      }),
      ...(phone !== undefined && { phone }),
      ...(whatsappId !== undefined && { whatsappId }),
    },
    select: {
      searchPreferences: true,
      phone: true,
      whatsappId: true,
    },
  });

  return NextResponse.json(user);
}
