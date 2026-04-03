import { anthropic } from "./client";
import type { Listing } from "@/generated/prisma";

interface ScamAnalysis {
  scamScore: number; // 0-1
  flags: string[];
}

interface QualityAnalysis {
  qualityScore: number; // 0-1
  summary: string;
}

/**
 * Analyze a listing for scam signals.
 */
export async function analyzeScamRisk(
  listing: Pick<
    Listing,
    "title" | "description" | "price" | "neighborhood" | "images" | "contactEmail" | "contactPhone" | "source"
  >
): Promise<ScamAnalysis> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: `Analyze this NYC apartment listing for scam signals. Return JSON only.

LISTING:
- Title: ${listing.title}
- Price: ${listing.price ? `$${listing.price / 100}/month` : "Not listed"}
- Neighborhood: ${listing.neighborhood ?? "Unknown"}
- Source: ${listing.source}
- Has images: ${listing.images.length > 0 ? `Yes (${listing.images.length})` : "No"}
- Contact email: ${listing.contactEmail ?? "None"}
- Contact phone: ${listing.contactPhone ?? "None"}
${listing.description ? `- Description (first 500 chars): ${listing.description.slice(0, 500)}` : "- No description"}

SCAM SIGNALS TO CHECK:
1. Price way below market for the neighborhood
2. No images or stock-looking images
3. Vague or too-good description
4. Requests for wire transfer, money order, or upfront payment
5. Landlord claims to be out of town/country
6. Poor grammar suggesting a non-local scammer
7. Gmail/yahoo contact for a supposedly luxury building
8. Missing key details (no address, vague location)
9. Pressure to act immediately
10. Copy-pasted descriptions found on multiple listings

Return ONLY valid JSON in this format:
{"scamScore": 0.0, "flags": ["reason1", "reason2"]}

scamScore: 0 = definitely legit, 1 = definitely scam. Most listings should score 0.1-0.3.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "{}";

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        scamScore: Math.max(0, Math.min(1, parsed.scamScore ?? 0.2)),
        flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      };
    }
  } catch {
    // Default to low risk if parsing fails
  }

  return { scamScore: 0.2, flags: [] };
}

/**
 * Score listing quality based on completeness and attractiveness.
 */
export async function analyzeListingQuality(
  listing: Pick<
    Listing,
    "title" | "description" | "price" | "images" | "amenities" | "address" | "bedrooms" | "bathrooms" | "sqft" | "neighborhood"
  >
): Promise<QualityAnalysis> {
  // Quick heuristic scoring (no API call needed for basic checks)
  let score = 0.5;
  const factors: string[] = [];

  // Completeness checks
  if (listing.images.length >= 5) {
    score += 0.1;
    factors.push("Good photo coverage");
  } else if (listing.images.length === 0) {
    score -= 0.2;
    factors.push("No photos");
  }

  if (listing.description && listing.description.length > 200) {
    score += 0.1;
    factors.push("Detailed description");
  } else if (!listing.description) {
    score -= 0.15;
    factors.push("No description");
  }

  if (listing.address) score += 0.05;
  if (listing.bedrooms != null) score += 0.05;
  if (listing.bathrooms != null) score += 0.05;
  if (listing.sqft) score += 0.05;
  if (listing.amenities.length > 3) score += 0.05;
  if (listing.price) score += 0.05;

  return {
    qualityScore: Math.max(0, Math.min(1, score)),
    summary: factors.join(". ") || "Average listing",
  };
}
