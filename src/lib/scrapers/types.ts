import { ListingSource, ContactMethod } from "@/lib/db/types";

/**
 * Raw listing data extracted by a scraper before normalization.
 */
export interface RawListing {
  source: ListingSource;
  sourceId?: string;
  sourceUrl?: string;
  title: string;
  description?: string;
  price?: number; // in cents
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  images: string[];
  amenities: string[];
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactMethod?: ContactMethod;
  petPolicy?: string;
  availableDate?: Date;
  leaseTerm?: string;
  brokerFee?: boolean;
  postedAt?: Date;
  rawData?: Record<string, unknown>;
}

/**
 * Scraping level in the waterfall strategy.
 */
export enum ScrapeLevel {
  API_RSS = 1,
  STRUCTURED_DATA = 2,
  HTML_PARSING = 3,
  HEADLESS_BROWSER = 4,
  VISION = 5,
}

/**
 * Result from a single scraping attempt at one level.
 */
export interface ScrapeResult {
  success: boolean;
  level: ScrapeLevel;
  listings: RawListing[];
  error?: string;
}

/**
 * Configuration for a scraping run.
 */
export interface ScrapeConfig {
  neighborhoods: string[];
  maxPrice?: number;
  minBedrooms?: number;
  maxResults?: number;
}

/**
 * Interface every source adapter must implement.
 */
export interface SourceAdapter {
  source: ListingSource;
  name: string;

  /**
   * Scrape listings using the waterfall strategy.
   * Tries each level in order, returning results from the first that succeeds.
   */
  scrape(config: ScrapeConfig): Promise<ScrapeResult>;

  /**
   * Which scrape levels this adapter supports.
   */
  supportedLevels: ScrapeLevel[];
}
