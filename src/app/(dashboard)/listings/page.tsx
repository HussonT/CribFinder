"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ListingCard } from "@/components/listings/listing-card";
import {
  ListingFilters,
  type FilterValues,
} from "@/components/listings/listing-filters";
import { ShortlistModal } from "@/components/shortlist-modal";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Loader2, RefreshCw, MapPin } from "lucide-react";
import type { Listing } from "@/lib/db/types";

interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  pages: number;
}

export default function ListingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<ListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    neighborhoods: [],
    sort: "newest",
  });
  const [page, setPage] = useState(1);
  const [showMap, setShowMap] = useState(false);
  const [shortlistModal, setShortlistModal] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();

    if (filters.search) params.set("search", filters.search);
    if (filters.neighborhoods.length > 0)
      params.set("neighborhood", filters.neighborhoods.join(","));
    if (filters.minPrice)
      params.set("minPrice", String(parseInt(filters.minPrice) * 100));
    if (filters.maxPrice)
      params.set("maxPrice", String(parseInt(filters.maxPrice) * 100));
    if (filters.bedrooms) params.set("bedrooms", filters.bedrooms);
    if (filters.source) params.set("source", filters.source);
    params.set("sort", filters.sort);
    params.set("page", String(page));

    try {
      const res = await fetch(`/api/listings?${params}`);
      const json = await res.json();
      setData(json);
    } catch {
      toast("Failed to load listings", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, page, toast]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleScrape = async () => {
    setScraping(true);
    toast("Scraping started — this may take a minute", "info");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          neighborhoods:
            filters.neighborhoods.length > 0
              ? filters.neighborhoods
              : undefined,
        }),
      });
      const result = await res.json();
      toast(`Found ${result.total} new listings`, "success");
      await fetchListings();
    } catch {
      toast("Scrape failed — check your connection", "error");
    } finally {
      setScraping(false);
    }
  };

  const handleContact = async (listingId: string) => {
    try {
      toast("Drafting your message with AI...", "info");
      const convRes = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const conversation = await convRes.json();

      const draftRes = await fetch("/api/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "draft_outreach",
          listingId,
          tone: "friendly",
        }),
      });
      const { draft } = await draftRes.json();

      router.push(
        `/inbox?conversation=${conversation.id}&draft=${encodeURIComponent(draft)}`
      );
    } catch {
      toast("Failed to draft message", "error");
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data?.total ?? 0} apartments across downtown Manhattan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setShowMap(!showMap)}
          >
            <MapPin className="w-4 h-4 mr-1" />
            {showMap ? "List" : "Map"}
          </Button>
          <Button
            variant="secondary"
            onClick={handleScrape}
            disabled={scraping}
          >
            {scraping ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1" />
            )}
            {scraping ? "Scraping..." : "Refresh Listings"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <ListingFilters filters={filters} onChange={setFilters} />

      {/* Listings grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : data?.listings.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg">No listings found</p>
          <p className="text-gray-400 text-sm mt-1">
            Try adjusting your filters or scrape for new listings
          </p>
          <Button className="mt-4" onClick={handleScrape}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Scrape Now
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {data?.listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onAddToShortlist={(id) => setShortlistModal(id)}
                onContact={handleContact}
              />
            ))}
          </div>

          {/* Pagination */}
          {data && data.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {data.page} of {data.pages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= data.pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Shortlist selector modal */}
      {shortlistModal && (
        <ShortlistModal
          listingId={shortlistModal}
          open={!!shortlistModal}
          onClose={() => setShortlistModal(null)}
          onAdded={() => toast("Added to shortlist!", "success")}
        />
      )}
    </div>
  );
}
