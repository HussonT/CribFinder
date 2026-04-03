"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TARGET_NEIGHBORHOODS } from "@/lib/utils";
import { Search, SlidersHorizontal, X } from "lucide-react";

export interface FilterValues {
  search?: string;
  neighborhoods: string[];
  minPrice?: string;
  maxPrice?: string;
  bedrooms?: string;
  source?: string;
  sort: string;
}

interface ListingFiltersProps {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
}

export function ListingFilters({ filters, onChange }: ListingFiltersProps) {
  const [expanded, setExpanded] = useState(false);

  const update = (partial: Partial<FilterValues>) => {
    onChange({ ...filters, ...partial });
  };

  const toggleNeighborhood = (n: string) => {
    const current = filters.neighborhoods;
    const next = current.includes(n)
      ? current.filter((x) => x !== n)
      : [...current, n];
    update({ neighborhoods: next });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search listings..."
            value={filters.search ?? ""}
            onChange={(e) => update({ search: e.target.value })}
            className="pl-9"
          />
        </div>
        <Select
          value={filters.sort}
          onChange={(e) => update({ sort: e.target.value })}
          className="w-40"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="quality">Quality Score</option>
        </Select>
        <Button
          variant={expanded ? "primary" : "secondary"}
          onClick={() => setExpanded(!expanded)}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Neighborhoods */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Neighborhoods
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TARGET_NEIGHBORHOODS.map((n) => (
                <button
                  key={n}
                  onClick={() => toggleNeighborhood(n)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    filters.neighborhoods.includes(n)
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Min Price
              </label>
              <Input
                type="number"
                placeholder="$0"
                value={filters.minPrice ?? ""}
                onChange={(e) => update({ minPrice: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Max Price
              </label>
              <Input
                type="number"
                placeholder="$10,000"
                value={filters.maxPrice ?? ""}
                onChange={(e) => update({ maxPrice: e.target.value })}
              />
            </div>
          </div>

          {/* Bedrooms & Source */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Min Bedrooms
              </label>
              <Select
                value={filters.bedrooms ?? ""}
                onChange={(e) => update({ bedrooms: e.target.value })}
              >
                <option value="">Any</option>
                <option value="0">Studio+</option>
                <option value="1">1+</option>
                <option value="2">2+</option>
                <option value="3">3+</option>
                <option value="4">4+</option>
              </Select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Source
              </label>
              <Select
                value={filters.source ?? ""}
                onChange={(e) => update({ source: e.target.value })}
              >
                <option value="">All Sources</option>
                <option value="CRAIGSLIST">Craigslist</option>
                <option value="STREETEASY">StreetEasy</option>
                <option value="ZILLOW">Zillow</option>
              </Select>
            </div>
          </div>

          {/* Active filters */}
          {(filters.neighborhoods.length > 0 ||
            filters.minPrice ||
            filters.maxPrice) && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Active filters:</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange({
                    search: "",
                    neighborhoods: [],
                    sort: "newest",
                  })
                }
              >
                <X className="w-3 h-3 mr-1" />
                Clear all
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
