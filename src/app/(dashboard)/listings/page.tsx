"use client";

import { useEffect, useState, useCallback } from "react";
import { ListingCard } from "@/components/listings/listing-card";
import {
  ListingFilters,
  type FilterValues,
} from "@/components/listings/listing-filters";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, MapPin } from "lucide-react";
import type { Listing } from "@/generated/prisma";

interface ListingsResponse {
  listings: Listing[];
  total: number;
  page: number;
  pages: number;
}

export default function ListingsPage() {
  const [data, setData] = useState<ListingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    neighborhoods: [],
    sort: "newest",
  });
  const [page, setPage] = useState(1);
  const [showMap, setShowMap] = useState(false);

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
    } catch (err) {
      console.error("Failed to fetch listings:", err);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleScrape = async () => {
    setScraping(true);
    try {
      await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          neighborhoods: filters.neighborhoods.length > 0
            ? filters.neighborhoods
            : undefined,
        }),
      });
      await fetchListings();
    } catch (err) {
      console.error("Scrape failed:", err);
    } finally {
      setScraping(false);
    }
  };

  const handleAddToShortlist = async (listingId: string) => {
    // For now, prompt which shortlist — in future, show a dropdown
    // TODO: Shortlist selector modal
    try {
      const res = await fetch("/api/shortlists");
      const shortlists = await res.json();

      if (shortlists.length === 0) {
        // Create default shortlist
        const createRes = await fetch("/api/shortlists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "My Favorites" }),
        });
        const newList = await createRes.json();
        await addToShortlist(newList.id, listingId);
      } else {
        await addToShortlist(shortlists[0].id, listingId);
      }
    } catch (err) {
      console.error("Failed to add to shortlist:", err);
    }
  };

  const addToShortlist = async (shortlistId: string, listingId: string) => {
    await fetch(`/api/shortlists/${shortlistId}/listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
  };

  const handleContact = async (listingId: string) => {
    try {
      // Create conversation and draft message
      const convRes = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const conversation = await convRes.json();

      // Get AI draft
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

      // Navigate to inbox with draft
      window.location.href = `/inbox?conversation=${conversation.id}&draft=${encodeURIComponent(draft)}`;
    } catch (err) {
      console.error("Failed to start contact:", err);
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
                onAddToShortlist={handleAddToShortlist}
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
    </div>
  );
}
