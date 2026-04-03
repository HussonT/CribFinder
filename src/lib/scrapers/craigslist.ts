import { ListingSource } from "@/lib/db/types";
import {
  type SourceAdapter,
  type ScrapeConfig,
  type ScrapeResult,
  type RawListing,
  ScrapeLevel,
} from "./types";

/**
 * Craigslist adapter — uses RSS feeds (Level 1) with HTML fallback (Level 3).
 *
 * Craigslist NYC apartments RSS:
 * https://newyork.craigslist.org/search/mnh/apa?format=rss&availabilityMode=0
 *
 * Neighborhood filtering via query params or post-filter.
 */

const CL_BASE = "https://newyork.craigslist.org";

// Map our neighborhoods to Craigslist area codes
const NEIGHBORHOOD_QUERIES: Record<string, string> = {
  "West Village": "west village",
  "Greenwich Village": "greenwich village",
  SoHo: "soho",
  NoHo: "noho",
  Chelsea: "chelsea",
  Flatiron: "flatiron",
  "Meatpacking District": "meatpacking",
  "Hudson Square": "hudson square",
  NoLita: "nolita",
  "Little Italy": "little italy",
  Tribeca: "tribeca",
};

async function scrapeViaRSS(config: ScrapeConfig): Promise<ScrapeResult> {
  try {
    const RSSParser = (await import("rss-parser")).default;
    const parser = new RSSParser();

    const listings: RawListing[] = [];

    for (const neighborhood of config.neighborhoods) {
      const query = NEIGHBORHOOD_QUERIES[neighborhood] ?? neighborhood;
      const url = `${CL_BASE}/search/mnh/apa?format=rss&query=${encodeURIComponent(query)}&availabilityMode=0${config.maxPrice ? `&max_price=${config.maxPrice / 100}` : ""}${config.minBedrooms ? `&min_bedrooms=${config.minBedrooms}` : ""}`;

      try {
        const feed = await parser.parseURL(url);

        for (const item of feed.items.slice(0, config.maxResults ?? 50)) {
          const listing = parseRSSItem(item, neighborhood);
          if (listing) listings.push(listing);
        }
      } catch {
        console.warn(`CL RSS failed for ${neighborhood}`);
      }
    }

    return {
      success: listings.length > 0,
      level: ScrapeLevel.API_RSS,
      listings,
      error: listings.length === 0 ? "No RSS results" : undefined,
    };
  } catch (error) {
    return {
      success: false,
      level: ScrapeLevel.API_RSS,
      listings: [],
      error: error instanceof Error ? error.message : "RSS parse failed",
    };
  }
}

function parseRSSItem(
  item: Record<string, unknown>,
  neighborhood: string
): RawListing | null {
  const title = (item.title as string) ?? "";
  const link = (item.link as string) ?? "";
  const content = (item.content as string) ?? (item.contentSnippet as string) ?? "";

  // Extract price from title: "$2,500 / 1br"
  const priceMatch = title.match(/\$([0-9,]+)/);
  const price = priceMatch
    ? parseInt(priceMatch[1].replace(/,/g, "")) * 100
    : undefined;

  // Extract bedrooms from title
  const brMatch = title.match(/(\d+)br/);
  const bedrooms = brMatch ? parseInt(brMatch[1]) : undefined;

  // Extract sqft
  const sqftMatch = title.match(/(\d+)ft/);
  const sqft = sqftMatch ? parseInt(sqftMatch[1]) : undefined;

  // Extract images from content HTML
  const images: string[] = [];
  const imgMatches = content.matchAll(/<img[^>]+src="([^"]+)"/g);
  for (const match of imgMatches) {
    images.push(match[1]);
  }

  // Extract ID from URL
  const idMatch = link.match(/\/(\d+)\.html/);
  const sourceId = idMatch ? idMatch[1] : undefined;

  return {
    source: ListingSource.CRAIGSLIST,
    sourceId,
    sourceUrl: link,
    title: title.replace(/\$[0-9,]+\s*\/\s*\d+br\s*-?\s*/, "").trim() || title,
    description: content.replace(/<[^>]*>/g, "").trim(),
    price,
    bedrooms,
    sqft,
    neighborhood,
    city: "New York",
    state: "NY",
    images,
    amenities: extractAmenities(content + " " + title),
    contactMethod: "EMAIL",
    postedAt: item.pubDate ? new Date(item.pubDate as string) : undefined,
    rawData: item as Record<string, unknown>,
  };
}

function extractAmenities(text: string): string[] {
  const amenities: string[] = [];
  const lower = text.toLowerCase();

  const checks: [string, string][] = [
    ["laundry", "Laundry"],
    ["dishwasher", "Dishwasher"],
    ["doorman", "Doorman"],
    ["elevator", "Elevator"],
    ["gym", "Gym"],
    ["roof", "Roof Access"],
    ["parking", "Parking"],
    ["pet", "Pet Friendly"],
    ["dog", "Dogs OK"],
    ["cat", "Cats OK"],
    ["no fee", "No Broker Fee"],
    ["renovated", "Renovated"],
    ["hardwood", "Hardwood Floors"],
    ["central air", "Central Air"],
    ["a/c", "A/C"],
    ["washer", "Washer/Dryer"],
    ["balcony", "Balcony"],
    ["terrace", "Terrace"],
    ["fireplace", "Fireplace"],
    ["storage", "Storage"],
  ];

  for (const [keyword, label] of checks) {
    if (lower.includes(keyword)) amenities.push(label);
  }

  return amenities;
}

async function scrapeViaHTML(config: ScrapeConfig): Promise<ScrapeResult> {
  try {
    const cheerio = await import("cheerio");
    const listings: RawListing[] = [];

    for (const neighborhood of config.neighborhoods) {
      const query = NEIGHBORHOOD_QUERIES[neighborhood] ?? neighborhood;
      const url = `${CL_BASE}/search/mnh/apa?query=${encodeURIComponent(query)}&availabilityMode=0${config.maxPrice ? `&max_price=${config.maxPrice / 100}` : ""}`;

      const { fetchWithTimeout } = await import("./fetch");
      const response = await fetchWithTimeout(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
      });

      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      $(".cl-search-result, .result-row").each((_, el) => {
        const $el = $(el);
        const link = $el.find("a.posting-title, a.result-title").attr("href") ?? "";
        const title = $el.find("a.posting-title, a.result-title").text().trim();
        const priceText = $el.find(".priceinfo, .result-price").text();
        const priceMatch = priceText.match(/\$([0-9,]+)/);
        const price = priceMatch
          ? parseInt(priceMatch[1].replace(/,/g, "")) * 100
          : undefined;

        const housing = $el.find(".housing").text();
        const brMatch = housing.match(/(\d+)br/);
        const sqftMatch = housing.match(/(\d+)ft/);

        const idMatch = link.match(/\/(\d+)\.html/);

        if (title) {
          listings.push({
            source: ListingSource.CRAIGSLIST,
            sourceId: idMatch ? idMatch[1] : undefined,
            sourceUrl: link.startsWith("http") ? link : CL_BASE + link,
            title,
            price,
            bedrooms: brMatch ? parseInt(brMatch[1]) : undefined,
            sqft: sqftMatch ? parseInt(sqftMatch[1]) : undefined,
            neighborhood,
            city: "New York",
            state: "NY",
            images: [],
            amenities: extractAmenities(title),
          });
        }
      });
    }

    return {
      success: listings.length > 0,
      level: ScrapeLevel.HTML_PARSING,
      listings,
      error: listings.length === 0 ? "No HTML results" : undefined,
    };
  } catch (error) {
    return {
      success: false,
      level: ScrapeLevel.HTML_PARSING,
      listings: [],
      error: error instanceof Error ? error.message : "HTML scrape failed",
    };
  }
}

export const craigslistAdapter: SourceAdapter = {
  source: ListingSource.CRAIGSLIST,
  name: "Craigslist",
  supportedLevels: [ScrapeLevel.API_RSS, ScrapeLevel.HTML_PARSING],

  async scrape(config: ScrapeConfig): Promise<ScrapeResult> {
    // Level 1: RSS
    const rssResult = await scrapeViaRSS(config);
    if (rssResult.success) return rssResult;

    // Level 3: HTML parsing
    const htmlResult = await scrapeViaHTML(config);
    if (htmlResult.success) return htmlResult;

    return {
      success: false,
      level: ScrapeLevel.HTML_PARSING,
      listings: [],
      error: "All Craigslist scraping levels failed",
    };
  },
};
