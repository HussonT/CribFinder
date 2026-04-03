import { ListingSource } from "@/generated/prisma";
import {
  type SourceAdapter,
  type ScrapeConfig,
  type ScrapeResult,
  type RawListing,
  ScrapeLevel,
} from "./types";

/**
 * Zillow adapter — targets their search API / preloaded JSON (Level 2)
 * with HTML fallback (Level 3) and headless (Level 4).
 *
 * Zillow embeds search results as JSON in a <script> tag on their pages,
 * which is easier to parse than DOM scraping.
 */

const ZILLOW_BASE = "https://www.zillow.com";

const NEIGHBORHOOD_URLS: Record<string, string> = {
  "West Village": "west-village-new-york-ny",
  "Greenwich Village": "greenwich-village-new-york-ny",
  SoHo: "soho-new-york-ny",
  NoHo: "noho-new-york-ny",
  Chelsea: "chelsea-new-york-ny",
  Flatiron: "flatiron-new-york-ny",
  "Meatpacking District": "meatpacking-district-new-york-ny",
  "Hudson Square": "hudson-square-new-york-ny",
  NoLita: "nolita-new-york-ny",
  "Little Italy": "little-italy-new-york-ny",
  Tribeca: "tribeca-new-york-ny",
};

async function scrapeViaPreloadedData(
  config: ScrapeConfig
): Promise<ScrapeResult> {
  try {
    const cheerio = await import("cheerio");
    const listings: RawListing[] = [];

    for (const neighborhood of config.neighborhoods) {
      const slug = NEIGHBORHOOD_URLS[neighborhood];
      if (!slug) continue;

      const url = `${ZILLOW_BASE}/${slug}/rentals/`;

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

      // Zillow embeds search data in __NEXT_DATA__ or a preloaded script
      $("script").each((_, el) => {
        const text = $(el).html() ?? "";

        // Try __NEXT_DATA__
        if (text.includes('"searchResults"') || text.includes('"listResults"')) {
          try {
            const data = JSON.parse(text);
            const results =
              data?.props?.pageProps?.searchPageState?.cat1?.searchResults
                ?.listResults ??
              data?.props?.pageProps?.searchResults?.listResults ??
              [];

            for (const item of results) {
              const listing = parseZillowResult(item, neighborhood);
              if (listing) listings.push(listing);
            }
          } catch {
            // Try regex extraction for embedded JSON
            const match = text.match(/"listResults"\s*:\s*(\[[\s\S]*?\])\s*,\s*"/);
            if (match) {
              try {
                const results = JSON.parse(match[1]);
                for (const item of results) {
                  const listing = parseZillowResult(item, neighborhood);
                  if (listing) listings.push(listing);
                }
              } catch {
                // Skip
              }
            }
          }
        }
      });

      // Also try JSON-LD
      $('script[type="application/ld+json"]').each((_, el) => {
        try {
          const data = JSON.parse($(el).html() ?? "");
          if (data["@type"] === "ItemList") {
            for (const item of data.itemListElement ?? []) {
              const listing = parseZillowJsonLd(item, neighborhood);
              if (listing) listings.push(listing);
            }
          }
        } catch {
          // Skip
        }
      });
    }

    return {
      success: listings.length > 0,
      level: ScrapeLevel.STRUCTURED_DATA,
      listings,
      error: listings.length === 0 ? "No Zillow preloaded data found" : undefined,
    };
  } catch (error) {
    return {
      success: false,
      level: ScrapeLevel.STRUCTURED_DATA,
      listings: [],
      error: error instanceof Error ? error.message : "Zillow scrape failed",
    };
  }
}

function parseZillowResult(
  item: Record<string, unknown>,
  neighborhood: string
): RawListing | null {
  try {
    const zpid = item.zpid?.toString() ?? item.id?.toString();
    const detailUrl = (item.detailUrl as string) ?? "";
    const price = item.unformattedPrice ?? item.price;
    const priceNum =
      typeof price === "number"
        ? price * 100
        : typeof price === "string"
          ? parseInt(price.replace(/[^0-9]/g, "")) * 100
          : undefined;

    const address = item.address as string | undefined;
    const beds = item.beds as number | undefined;
    const baths = item.baths as number | undefined;
    const area = item.area as number | undefined;

    const imgSrc = (item.imgSrc as string) ?? "";
    const images = imgSrc ? [imgSrc] : [];

    // Additional images from carouselPhotos
    if (Array.isArray(item.carouselPhotos)) {
      for (const photo of item.carouselPhotos as Array<{ url?: string }>) {
        if (photo.url) images.push(photo.url);
      }
    }

    const lat = item.latLong
      ? (item.latLong as Record<string, number>).latitude
      : (item.latitude as number | undefined);
    const lng = item.latLong
      ? (item.latLong as Record<string, number>).longitude
      : (item.longitude as number | undefined);

    return {
      source: ListingSource.ZILLOW,
      sourceId: zpid,
      sourceUrl: detailUrl.startsWith("http")
        ? detailUrl
        : ZILLOW_BASE + detailUrl,
      title: address ?? `${beds ?? "?"}BR in ${neighborhood}`,
      price: priceNum,
      bedrooms: beds,
      bathrooms: baths,
      sqft: area,
      address,
      neighborhood,
      city: "New York",
      state: "NY",
      latitude: lat,
      longitude: lng,
      images,
      amenities: [],
      rawData: item,
    };
  } catch {
    return null;
  }
}

function parseZillowJsonLd(
  item: Record<string, unknown>,
  neighborhood: string
): RawListing | null {
  try {
    const url = (item.url as string) ?? "";
    const name = (item.name as string) ?? "";
    const image = item.image as string | string[] | undefined;
    const images = Array.isArray(image)
      ? image
      : image
        ? [image]
        : [];

    return {
      source: ListingSource.ZILLOW,
      sourceUrl: url.startsWith("http") ? url : ZILLOW_BASE + url,
      title: name,
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

async function scrapeViaHeadless(
  config: ScrapeConfig
): Promise<ScrapeResult> {
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    const listings: RawListing[] = [];

    try {
      const page = await browser.newPage();

      for (const neighborhood of config.neighborhoods) {
        const slug = NEIGHBORHOOD_URLS[neighborhood];
        if (!slug) continue;

        const url = `${ZILLOW_BASE}/${slug}/rentals/`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

        // Wait for results
        await page
          .waitForSelector("[data-test='property-card'], article.list-card", {
            timeout: 10000,
          })
          .catch(() => {});

        const results = await page.evaluate(() => {
          const cards = document.querySelectorAll(
            "[data-test='property-card'], article.list-card, .ListItem"
          );
          return Array.from(cards).map((card) => {
            const link = card.querySelector("a") as HTMLAnchorElement;
            const priceEl = card.querySelector(
              "[data-test='property-card-price'], .list-card-price"
            );
            const addressEl = card.querySelector(
              "[data-test='property-card-addr'], address"
            );
            const detailEls = card.querySelectorAll(
              "[data-test='property-card-details'] li, .list-card-details li"
            );
            const img = card.querySelector("img") as HTMLImageElement;

            const details = Array.from(detailEls).map(
              (el) => el.textContent?.trim() ?? ""
            );

            return {
              href: link?.href ?? "",
              price: priceEl?.textContent?.trim() ?? "",
              address: addressEl?.textContent?.trim() ?? "",
              details,
              image: img?.src ?? "",
            };
          });
        });

        for (const r of results) {
          const priceMatch = r.price.match(/\$([0-9,]+)/);
          const bedMatch = r.details
            .join(" ")
            .match(/(\d+)\s*(?:bd|bed|br)/i);
          const bathMatch = r.details
            .join(" ")
            .match(/(\d+)\s*(?:ba|bath)/i);
          const sqftMatch = r.details
            .join(" ")
            .match(/([\d,]+)\s*sqft/i);
          const idMatch = r.href.match(/\/(\d+)_zpid/);

          listings.push({
            source: ListingSource.ZILLOW,
            sourceId: idMatch ? idMatch[1] : undefined,
            sourceUrl: r.href,
            title: r.address || "Zillow Rental",
            price: priceMatch
              ? parseInt(priceMatch[1].replace(/,/g, "")) * 100
              : undefined,
            bedrooms: bedMatch ? parseFloat(bedMatch[1]) : undefined,
            bathrooms: bathMatch ? parseFloat(bathMatch[1]) : undefined,
            sqft: sqftMatch
              ? parseInt(sqftMatch[1].replace(/,/g, ""))
              : undefined,
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

export const zillowAdapter: SourceAdapter = {
  source: ListingSource.ZILLOW,
  name: "Zillow",
  supportedLevels: [
    ScrapeLevel.STRUCTURED_DATA,
    ScrapeLevel.HEADLESS_BROWSER,
  ],

  async scrape(config: ScrapeConfig): Promise<ScrapeResult> {
    // Level 2: Preloaded JSON data
    const preloadedResult = await scrapeViaPreloadedData(config);
    if (preloadedResult.success) return preloadedResult;

    // Level 4: Headless browser
    const headlessResult = await scrapeViaHeadless(config);
    if (headlessResult.success) return headlessResult;

    return {
      success: false,
      level: ScrapeLevel.HEADLESS_BROWSER,
      listings: [],
      error: "All Zillow scraping levels failed",
    };
  },
};
