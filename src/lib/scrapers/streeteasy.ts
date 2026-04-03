import { ListingSource } from "@/generated/prisma";
import {
  type SourceAdapter,
  type ScrapeConfig,
  type ScrapeResult,
  type RawListing,
  ScrapeLevel,
} from "./types";

/**
 * StreetEasy adapter — HTML parsing (Level 3) with headless fallback (Level 4).
 *
 * StreetEasy is the #1 source for NYC apartments. They don't have a public API
 * but their pages contain structured JSON-LD data and well-structured HTML.
 */

const SE_BASE = "https://streeteasy.com";

// StreetEasy URL slugs for neighborhoods
const NEIGHBORHOOD_SLUGS: Record<string, string> = {
  "West Village": "west-village",
  "Greenwich Village": "greenwich-village",
  SoHo: "soho",
  NoHo: "noho",
  Chelsea: "chelsea",
  Flatiron: "flatiron",
  "Meatpacking District": "meatpacking-district",
  "Hudson Square": "hudson-square",
  NoLita: "nolita",
  "Little Italy": "little-italy",
  Tribeca: "tribeca",
};

async function scrapeViaStructuredData(
  config: ScrapeConfig
): Promise<ScrapeResult> {
  try {
    const cheerio = await import("cheerio");
    const listings: RawListing[] = [];

    for (const neighborhood of config.neighborhoods) {
      const slug = NEIGHBORHOOD_SLUGS[neighborhood];
      if (!slug) continue;

      const priceFilter = config.maxPrice
        ? `%7Cprice:-${config.maxPrice / 100}`
        : "";
      const bedsFilter = config.minBedrooms
        ? `%7Cbeds%3E=${config.minBedrooms}`
        : "";
      const url = `${SE_BASE}/for-rent/${slug}${priceFilter}${bedsFilter}`;

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      if (!response.ok) continue;

      const html = await response.text();
      const $ = cheerio.load(html);

      // Try JSON-LD structured data first
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const data = JSON.parse($(el).html() ?? "");
          if (data["@type"] === "ItemList" && data.itemListElement) {
            for (const item of data.itemListElement) {
              const listing = parseJsonLd(item, neighborhood);
              if (listing) listings.push(listing);
            }
          }
        } catch {
          // Not valid JSON-LD, skip
        }
      });

      // Fallback: parse HTML search results
      if (listings.length === 0) {
        $("[data-testid='search-result'], .listingCard, .searchCardList--listItem").each(
          (_, el) => {
            const $el = $(el);
            const listing = parseSearchCard($, $el, neighborhood);
            if (listing) listings.push(listing);
          }
        );
      }
    }

    return {
      success: listings.length > 0,
      level: ScrapeLevel.STRUCTURED_DATA,
      listings,
      error: listings.length === 0 ? "No structured data found" : undefined,
    };
  } catch (error) {
    return {
      success: false,
      level: ScrapeLevel.STRUCTURED_DATA,
      listings: [],
      error: error instanceof Error ? error.message : "Structured data scrape failed",
    };
  }
}

function parseJsonLd(
  item: Record<string, unknown>,
  neighborhood: string
): RawListing | null {
  try {
    const url = (item.url as string) ?? "";
    const name = (item.name as string) ?? "";

    const priceSpec = item.offers as Record<string, unknown> | undefined;
    const price = priceSpec?.price
      ? Math.round(Number(priceSpec.price) * 100)
      : undefined;

    const images: string[] = [];
    if (Array.isArray(item.image)) {
      images.push(...(item.image as string[]));
    } else if (typeof item.image === "string") {
      images.push(item.image);
    }

    const idMatch = url.match(/\/(\d+)$/);

    return {
      source: ListingSource.STREETEASY,
      sourceId: idMatch ? idMatch[1] : undefined,
      sourceUrl: url.startsWith("http") ? url : SE_BASE + url,
      title: name,
      price,
      neighborhood,
      city: "New York",
      state: "NY",
      images,
      amenities: [],
      rawData: item,
    };
  } catch {
    return null;
  }
}

function parseSearchCard(
  $: ReturnType<typeof import("cheerio").load>,
  $el: ReturnType<ReturnType<typeof import("cheerio").load>>,
  neighborhood: string
): RawListing | null {
  try {
    const linkEl = $el.find("a[href*='/rental/']").first();
    const href = linkEl.attr("href") ?? "";
    const title =
      linkEl.text().trim() || $el.find(".listingCard-title, h3").text().trim();

    if (!title) return null;

    // Price
    const priceText = $el.find("[data-testid='price'], .price, .listingCard-price").text();
    const priceMatch = priceText.match(/\$([0-9,]+)/);
    const price = priceMatch
      ? parseInt(priceMatch[1].replace(/,/g, "")) * 100
      : undefined;

    // Beds/baths
    const detailText = $el.find(".listingCard-upperShortDetails, [data-testid='bed-bath']").text();
    const bedMatch = detailText.match(/(\d+)\s*(?:bed|br|BD)/i);
    const bathMatch = detailText.match(/(\d+)\s*(?:bath|ba|BA)/i);

    // Address
    const address = $el.find(".listingCard-address, [data-testid='address']").text().trim();

    // Image
    const images: string[] = [];
    const imgSrc = $el.find("img").attr("src") ?? $el.find("img").attr("data-src");
    if (imgSrc) images.push(imgSrc);

    const idMatch = href.match(/\/(\d+)$/);

    return {
      source: ListingSource.STREETEASY,
      sourceId: idMatch ? idMatch[1] : undefined,
      sourceUrl: href.startsWith("http") ? href : SE_BASE + href,
      title,
      price,
      bedrooms: bedMatch ? parseFloat(bedMatch[1]) : undefined,
      bathrooms: bathMatch ? parseFloat(bathMatch[1]) : undefined,
      address,
      neighborhood,
      city: "New York",
      state: "NY",
      images,
      amenities: [],
    };
  } catch {
    return null;
  }
}

async function scrapeViaHeadless(
  config: ScrapeConfig
): Promise<ScrapeResult> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const listings: RawListing[] = [];

    try {
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({
        "Accept-Language": "en-US,en;q=0.9",
      });

      for (const neighborhood of config.neighborhoods) {
        const slug = NEIGHBORHOOD_SLUGS[neighborhood];
        if (!slug) continue;

        const url = `${SE_BASE}/for-rent/${slug}`;
        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

        // Wait for listings to render
        await page.waitForSelector(
          "[data-testid='search-result'], .listingCard",
          { timeout: 10000 }
        ).catch(() => {});

        // Extract listing data from the page
        const results = await page.evaluate(() => {
          const cards = document.querySelectorAll(
            "[data-testid='search-result'], .listingCard, .searchCardList--listItem"
          );
          return Array.from(cards).map((card) => {
            const link = card.querySelector("a[href*='/rental/']") as HTMLAnchorElement;
            const priceEl = card.querySelector(
              "[data-testid='price'], .price, .listingCard-price"
            );
            const detailEl = card.querySelector(
              ".listingCard-upperShortDetails, [data-testid='bed-bath']"
            );
            const addressEl = card.querySelector(
              ".listingCard-address, [data-testid='address']"
            );
            const img = card.querySelector("img") as HTMLImageElement;

            return {
              href: link?.href ?? "",
              title: link?.textContent?.trim() ?? "",
              price: priceEl?.textContent?.trim() ?? "",
              details: detailEl?.textContent?.trim() ?? "",
              address: addressEl?.textContent?.trim() ?? "",
              image: img?.src ?? "",
            };
          });
        });

        for (const r of results) {
          if (!r.title) continue;
          const priceMatch = r.price.match(/\$([0-9,]+)/);
          const bedMatch = r.details.match(/(\d+)\s*(?:bed|br)/i);
          const bathMatch = r.details.match(/(\d+)\s*(?:bath|ba)/i);
          const idMatch = r.href.match(/\/(\d+)$/);

          listings.push({
            source: ListingSource.STREETEASY,
            sourceId: idMatch ? idMatch[1] : undefined,
            sourceUrl: r.href,
            title: r.title,
            price: priceMatch
              ? parseInt(priceMatch[1].replace(/,/g, "")) * 100
              : undefined,
            bedrooms: bedMatch ? parseFloat(bedMatch[1]) : undefined,
            bathrooms: bathMatch ? parseFloat(bathMatch[1]) : undefined,
            address: r.address,
            neighborhood,
            city: "New York",
            state: "NY",
            images: r.image ? [r.image] : [],
            amenities: [],
          });
        }
      }
    } finally {
      await browser.close();
    }

    return {
      success: listings.length > 0,
      level: ScrapeLevel.HEADLESS_BROWSER,
      listings,
      error: listings.length === 0 ? "No headless results" : undefined,
    };
  } catch (error) {
    return {
      success: false,
      level: ScrapeLevel.HEADLESS_BROWSER,
      listings: [],
      error: error instanceof Error ? error.message : "Headless scrape failed",
    };
  }
}

export const streetEasyAdapter: SourceAdapter = {
  source: ListingSource.STREETEASY,
  name: "StreetEasy",
  supportedLevels: [
    ScrapeLevel.STRUCTURED_DATA,
    ScrapeLevel.HTML_PARSING,
    ScrapeLevel.HEADLESS_BROWSER,
  ],

  async scrape(config: ScrapeConfig): Promise<ScrapeResult> {
    // Level 2: Structured data (JSON-LD) + HTML
    const structuredResult = await scrapeViaStructuredData(config);
    if (structuredResult.success) return structuredResult;

    // Level 4: Headless browser
    const headlessResult = await scrapeViaHeadless(config);
    if (headlessResult.success) return headlessResult;

    return {
      success: false,
      level: ScrapeLevel.HEADLESS_BROWSER,
      listings: [],
      error: "All StreetEasy scraping levels failed",
    };
  },
};
