import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runAllScrapers } from "@/lib/scrapers/engine";

// Trigger a scrape run
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));

  const result = await runAllScrapers({
    neighborhoods: body.neighborhoods,
    maxPrice: body.maxPrice,
    minBedrooms: body.minBedrooms,
  });

  return NextResponse.json(result);
}
