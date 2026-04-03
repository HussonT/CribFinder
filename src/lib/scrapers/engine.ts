import { prisma } from "@/lib/prisma";
import { generateFingerprint } from "@/lib/utils";
import { ScrapeJobStatus } from "@/lib/db/types";
import type { SourceAdapter, ScrapeConfig, RawListing } from "./types";
import { craigslistAdapter } from "./craigslist";
import { streetEasyAdapter } from "./streeteasy";
import { zillowAdapter } from "./zillow";
import { TARGET_NEIGHBORHOODS } from "@/lib/utils";
import { analyzeScamRisk, analyzeListingQuality } from "@/lib/ai/analysis";

const adapters: SourceAdapter[] = [
  craigslistAdapter,
  streetEasyAdapter,
  zillowAdapter,
];

const DEFAULT_CONFIG: ScrapeConfig = {
  neighborhoods: [...TARGET_NEIGHBORHOODS],
  maxPrice: 800000, // $8,000 in cents
  minBedrooms: 0,
  maxResults: 100,
};

/**
 * Run all scrapers, save results, and return counts.
 */
export async function runAllScrapers(
  config: Partial<ScrapeConfig> = {}
): Promise<{ total: number; bySource: Record<string, number> }> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const bySource: Record<string, number> = {};
  let total = 0;

  for (const adapter of adapters) {
    const job = await prisma.scrapeJob.create({
      data: { source: adapter.source, status: ScrapeJobStatus.RUNNING, startedAt: new Date() },
    });

    try {
      const result = await adapter.scrape(mergedConfig);

      if (result.success && result.listings.length > 0) {
        const saved = await saveListings(result.listings);
        bySource[adapter.name] = saved;
        total += saved;

        await prisma.scrapeJob.update({
          where: { id: job.id },
          data: {
            status: ScrapeJobStatus.COMPLETED,
            levelUsed: result.level,
            listingsFound: saved,
            completedAt: new Date(),
          },
        });
      } else {
        await prisma.scrapeJob.update({
          where: { id: job.id },
          data: {
            status: ScrapeJobStatus.FAILED,
            errorMessage: result.error ?? "No listings found",
            completedAt: new Date(),
          },
        });
      }
    } catch (error) {
      await prisma.scrapeJob.update({
        where: { id: job.id },
        data: {
          status: ScrapeJobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
          completedAt: new Date(),
        },
      });
    }
  }

  return { total, bySource };
}

/**
 * Save raw listings to the database, handling deduplication.
 */
async function saveListings(listings: RawListing[]): Promise<number> {
  let saved = 0;

  for (const raw of listings) {
    const fingerprint = generateFingerprint(raw);

    try {
      await prisma.listing.upsert({
        where: {
          source_sourceId: {
            source: raw.source,
            sourceId: raw.sourceId ?? fingerprint,
          },
        },
        update: {
          title: raw.title,
          description: raw.description,
          price: raw.price,
          bedrooms: raw.bedrooms,
          bathrooms: raw.bathrooms,
          sqft: raw.sqft,
          address: raw.address,
          neighborhood: raw.neighborhood,
          city: raw.city ?? "New York",
          state: raw.state ?? "NY",
          zip: raw.zip,
          latitude: raw.latitude,
          longitude: raw.longitude,
          images: raw.images,
          amenities: raw.amenities,
          contactName: raw.contactName,
          contactPhone: raw.contactPhone,
          contactEmail: raw.contactEmail,
          contactMethod: raw.contactMethod ?? "UNKNOWN",
          petPolicy: raw.petPolicy,
          availableDate: raw.availableDate,
          leaseTerm: raw.leaseTerm,
          brokerFee: raw.brokerFee,
          postedAt: raw.postedAt,
          scrapedAt: new Date(),
          rawData: raw.rawData as object ?? undefined,
          fingerprint,
        },
        create: {
          source: raw.source,
          sourceId: raw.sourceId ?? fingerprint,
          sourceUrl: raw.sourceUrl,
          title: raw.title,
          description: raw.description,
          price: raw.price,
          bedrooms: raw.bedrooms,
          bathrooms: raw.bathrooms,
          sqft: raw.sqft,
          address: raw.address,
          neighborhood: raw.neighborhood,
          city: raw.city ?? "New York",
          state: raw.state ?? "NY",
          zip: raw.zip,
          latitude: raw.latitude,
          longitude: raw.longitude,
          images: raw.images,
          amenities: raw.amenities,
          contactName: raw.contactName,
          contactPhone: raw.contactPhone,
          contactEmail: raw.contactEmail,
          contactMethod: raw.contactMethod ?? "UNKNOWN",
          petPolicy: raw.petPolicy,
          availableDate: raw.availableDate,
          leaseTerm: raw.leaseTerm,
          brokerFee: raw.brokerFee,
          postedAt: raw.postedAt,
          rawData: raw.rawData as object ?? undefined,
          fingerprint,
        },
      });
      saved++;

      // Run AI analysis in the background (non-blocking for scraping speed)
      analyzeListingAsync(raw).catch(() => {});
    } catch {
      console.warn(`Failed to save listing: ${raw.title}`);
    }
  }

  return saved;
}

/**
 * Run AI scam detection and quality scoring on a listing.
 * Updates the database record asynchronously.
 */
async function analyzeListingAsync(raw: RawListing): Promise<void> {
  try {
    const [scamResult, qualityResult] = await Promise.all([
      analyzeScamRisk({
        title: raw.title,
        description: raw.description ?? null,
        price: raw.price ?? null,
        neighborhood: raw.neighborhood ?? null,
        images: raw.images,
        contactEmail: raw.contactEmail ?? null,
        contactPhone: raw.contactPhone ?? null,
        source: raw.source,
      }),
      analyzeListingQuality({
        title: raw.title,
        description: raw.description ?? null,
        price: raw.price ?? null,
        images: raw.images,
        amenities: raw.amenities,
        address: raw.address ?? null,
        bedrooms: raw.bedrooms ?? null,
        bathrooms: raw.bathrooms ?? null,
        sqft: raw.sqft ?? null,
        neighborhood: raw.neighborhood ?? null,
      }),
    ]);

    const fingerprint = generateFingerprint(raw);

    await prisma.listing.updateMany({
      where: {
        source: raw.source,
        sourceId: raw.sourceId ?? fingerprint,
      },
      data: {
        scamScore: scamResult.scamScore,
        scamFlags: scamResult.flags,
        qualityScore: qualityResult.qualityScore,
      },
    });
  } catch {
    // AI analysis failure shouldn't block scraping
  }
}
