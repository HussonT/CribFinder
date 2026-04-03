"use client";

import { useState } from "react";
import { formatPrice, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  ExternalLink,
  AlertTriangle,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { Listing } from "@/generated/prisma";

interface ListingCardProps {
  listing: Listing;
  onAddToShortlist?: (listingId: string) => void;
  onContact?: (listingId: string) => void;
  compact?: boolean;
}

export function ListingCard({
  listing,
  onAddToShortlist,
  onContact,
  compact = false,
}: ListingCardProps) {
  const [imageIndex, setImageIndex] = useState(0);

  const scamWarning = listing.scamScore != null && listing.scamScore > 0.6;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      {/* Image carousel */}
      <div className="relative aspect-[16/10] bg-gray-100">
        {listing.images.length > 0 ? (
          <>
            <img
              src={listing.images[imageIndex]}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
            {listing.images.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setImageIndex(
                      (i) =>
                        (i - 1 + listing.images.length) %
                        listing.images.length
                    )
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    setImageIndex(
                      (i) => (i + 1) % listing.images.length
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                  {imageIndex + 1} / {listing.images.length}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No photos
          </div>
        )}

        {/* Source badge */}
        <Badge className="absolute top-2 left-2 bg-white/90 text-gray-700">
          {listing.source}
        </Badge>

        {/* Scam warning */}
        {scamWarning && (
          <div className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5">
            <AlertTriangle className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {listing.title}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {listing.neighborhood ?? listing.address ?? listing.city}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-lg">{formatPrice(listing.price)}</p>
          </div>
        </div>

        {/* Details */}
        <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
          {listing.bedrooms != null && (
            <span>{listing.bedrooms} bed</span>
          )}
          {listing.bathrooms != null && (
            <span>{listing.bathrooms} bath</span>
          )}
          {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
          {listing.brokerFee === false && (
            <Badge variant="success">No Fee</Badge>
          )}
        </div>

        {/* Amenities preview */}
        {!compact && listing.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {listing.amenities.slice(0, 4).map((a) => (
              <Badge key={a} variant="default">
                {a}
              </Badge>
            ))}
            {listing.amenities.length > 4 && (
              <Badge variant="default">
                +{listing.amenities.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Quality score bar */}
        {listing.qualityScore != null && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500"
                style={{ width: `${listing.qualityScore * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">
              {Math.round(listing.qualityScore * 100)}
            </span>
          </div>
        )}

        {/* Scam flags */}
        {scamWarning && listing.scamFlags.length > 0 && (
          <div className="mt-2 p-2 bg-red-50 rounded-lg">
            <p className="text-xs font-medium text-red-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Potential scam signals
            </p>
            <ul className="text-xs text-red-600 mt-1 space-y-0.5">
              {listing.scamFlags.slice(0, 3).map((flag, i) => (
                <li key={i}>- {flag}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            {listing.postedAt
              ? timeAgo(listing.postedAt)
              : timeAgo(listing.scrapedAt)}
          </span>

          <div className="flex items-center gap-1">
            {listing.sourceUrl && (
              <a
                href={listing.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {onAddToShortlist && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAddToShortlist(listing.id)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Save
              </Button>
            )}
            {onContact && (
              <Button size="sm" onClick={() => onContact(listing.id)}>
                <MessageSquare className="w-4 h-4 mr-1" />
                Reach Out
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact version for shortlists
interface ShortlistListingCardProps {
  listing: Listing;
  status?: string;
  votes?: { value: number; userId: string }[];
  commentCount?: number;
  onVote?: (value: number) => void;
  onStatusChange?: (status: string) => void;
  currentUserId?: string;
}

export function ShortlistListingCard({
  listing,
  status,
  votes = [],
  commentCount = 0,
  onVote,
  onStatusChange,
  currentUserId,
}: ShortlistListingCardProps) {
  const upVotes = votes.filter((v) => v.value === 1).length;
  const downVotes = votes.filter((v) => v.value === -1).length;
  const hearts = votes.filter((v) => v.value === 2).length;
  const myVote = votes.find((v) => v.userId === currentUserId)?.value;

  const statusOptions = [
    "NEW",
    "INTERESTED",
    "CONTACTED",
    "TOUR_SCHEDULED",
    "APPLIED",
    "ACCEPTED",
    "REJECTED",
    "ARCHIVED",
  ];

  const statusColors: Record<string, string> = {
    NEW: "info",
    INTERESTED: "info",
    CONTACTED: "warning",
    TOUR_SCHEDULED: "warning",
    APPLIED: "warning",
    ACCEPTED: "success",
    REJECTED: "danger",
    ARCHIVED: "default",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex">
        {/* Thumbnail */}
        <div className="w-32 h-32 shrink-0 bg-gray-100">
          {listing.images[0] ? (
            <img
              src={listing.images[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
              No photo
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 p-3 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium text-sm truncate">{listing.title}</h3>
            <span className="font-bold text-sm shrink-0">
              {formatPrice(listing.price)}
            </span>
          </div>

          <p className="text-xs text-gray-500 mt-0.5">
            {listing.neighborhood ?? listing.city}
            {listing.bedrooms != null && ` · ${listing.bedrooms}BR`}
          </p>

          {/* Status */}
          {status && (
            <div className="mt-1.5">
              {onStatusChange ? (
                <select
                  value={status}
                  onChange={(e) => onStatusChange(e.target.value)}
                  className="text-xs border rounded px-1.5 py-0.5"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              ) : (
                <Badge
                  variant={
                    (statusColors[status] as
                      | "default"
                      | "success"
                      | "warning"
                      | "danger"
                      | "info") ?? "default"
                  }
                >
                  {status.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
          )}

          {/* Votes */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => onVote?.(1)}
              className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${myVote === 1 ? "bg-green-100 text-green-700" : "text-gray-400 hover:text-gray-600"}`}
            >
              <ThumbsUp className="w-3 h-3" />
              {upVotes > 0 && upVotes}
            </button>
            <button
              onClick={() => onVote?.(-1)}
              className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${myVote === -1 ? "bg-red-100 text-red-700" : "text-gray-400 hover:text-gray-600"}`}
            >
              <ThumbsDown className="w-3 h-3" />
              {downVotes > 0 && downVotes}
            </button>
            <button
              onClick={() => onVote?.(2)}
              className={`flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded ${myVote === 2 ? "bg-pink-100 text-pink-700" : "text-gray-400 hover:text-gray-600"}`}
            >
              <Heart className="w-3 h-3" />
              {hearts > 0 && hearts}
            </button>
            {commentCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                <MessageSquare className="w-3 h-3" />
                {commentCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
