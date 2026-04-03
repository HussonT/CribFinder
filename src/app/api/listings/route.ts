import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const neighborhood = searchParams.get("neighborhood");
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const bedrooms = searchParams.get("bedrooms");
  const source = searchParams.get("source");
  const search = searchParams.get("search");
  const sort = searchParams.get("sort") ?? "newest";
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const where: Record<string, unknown> = {};

  if (neighborhood) {
    where.neighborhood = { in: neighborhood.split(",") };
  }
  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { gte: parseInt(minPrice) } : {}),
      ...(maxPrice ? { lte: parseInt(maxPrice) } : {}),
    };
  }
  if (bedrooms) {
    where.bedrooms = { gte: parseFloat(bedrooms) };
  }
  if (source) {
    where.source = { in: source.split(",") };
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { address: { contains: search, mode: "insensitive" } },
    ];
  }

  const orderBy =
    sort === "price_asc"
      ? { price: "asc" as const }
      : sort === "price_desc"
        ? { price: "desc" as const }
        : sort === "quality"
          ? { qualityScore: "desc" as const }
          : { scrapedAt: "desc" as const };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.listing.count({ where }),
  ]);

  return NextResponse.json({
    listings,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
