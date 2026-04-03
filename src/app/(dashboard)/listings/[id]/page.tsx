"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, timeAgo } from "@/lib/utils";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Calendar,
  AlertTriangle,
  MessageSquare,
  Plus,
  ChevronLeft,
  ChevronRight,
  Shield,
  Star,
  Phone,
  Mail,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import type { Listing } from "@/lib/db/types";

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageIndex, setImageIndex] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then((r) => r.json())
      .then(setListing)
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [id]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleContact = async () => {
    const convRes = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: id }),
    });
    const conversation = await convRes.json();

    const draftRes = await fetch("/api/messages", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "draft_outreach",
        listingId: id,
        tone: "friendly",
      }),
    });
    const { draft } = await draftRes.json();
    router.push(
      `/inbox?conversation=${conversation.id}&draft=${encodeURIComponent(draft)}`
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 text-lg">Listing not found</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => router.push("/listings")}
        >
          Back to Listings
        </Button>
      </div>
    );
  }

  const scamWarning = listing.scamScore != null && listing.scamScore > 0.6;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to listings
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — images + details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image gallery */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() =>
                          setImageIndex(
                            (i) => (i + 1) % listing.images.length
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 text-white rounded-full p-2 hover:bg-black/80 transition"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                        {imageIndex + 1} / {listing.images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No photos available
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {listing.images.length > 1 && (
              <div className="flex gap-1 p-2 overflow-x-auto">
                {listing.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImageIndex(i)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                      i === imageIndex
                        ? "border-black"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          {listing.description && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-lg mb-3">Description</h2>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </div>
          )}

          {/* Amenities */}
          {listing.amenities.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-lg mb-3">Amenities</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {listing.amenities.map((a) => (
                  <div
                    key={a}
                    className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2"
                  >
                    <Check className="w-4 h-4 text-green-600 shrink-0" />
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scam Analysis */}
          {(listing.scamScore != null || listing.qualityScore != null) && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-lg mb-3">AI Analysis</h2>
              <div className="grid grid-cols-2 gap-4">
                {listing.qualityScore != null && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">Quality Score</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-yellow-500 rounded-full"
                          style={{
                            width: `${listing.qualityScore * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-mono text-gray-600">
                        {Math.round(listing.qualityScore * 100)}%
                      </span>
                    </div>
                  </div>
                )}
                {listing.scamScore != null && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield
                        className={`w-4 h-4 ${scamWarning ? "text-red-500" : "text-green-500"}`}
                      />
                      <span className="text-sm font-medium">Safety Score</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scamWarning ? "bg-red-500" : "bg-green-500"}`}
                          style={{
                            width: `${(1 - listing.scamScore) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-mono text-gray-600">
                        {Math.round((1 - listing.scamScore) * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {scamWarning && listing.scamFlags.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-sm font-medium text-red-700 flex items-center gap-1 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Warning Signs Detected
                  </p>
                  <ul className="space-y-1">
                    {listing.scamFlags.map((flag, i) => (
                      <li
                        key={i}
                        className="text-sm text-red-600 flex items-start gap-2"
                      >
                        <span className="mt-1.5 w-1 h-1 bg-red-400 rounded-full shrink-0" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column — key info + actions */}
        <div className="space-y-4">
          {/* Price & key details card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
            <div className="flex items-center gap-2 mb-1">
              <Badge>{listing.source}</Badge>
              {listing.brokerFee === false && (
                <Badge variant="success">No Fee</Badge>
              )}
            </div>

            <h1 className="text-xl font-bold mt-3">{listing.title}</h1>

            {(listing.address || listing.neighborhood) && (
              <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {listing.address ?? listing.neighborhood}, {listing.city}
              </p>
            )}

            <p className="text-3xl font-bold mt-4">
              {formatPrice(listing.price)}
              <span className="text-base font-normal text-gray-400">
                /month
              </span>
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {listing.bedrooms != null && (
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <Bed className="w-5 h-5 mx-auto text-gray-400" />
                  <p className="font-semibold mt-1">{listing.bedrooms}</p>
                  <p className="text-xs text-gray-500">Beds</p>
                </div>
              )}
              {listing.bathrooms != null && (
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <Bath className="w-5 h-5 mx-auto text-gray-400" />
                  <p className="font-semibold mt-1">{listing.bathrooms}</p>
                  <p className="text-xs text-gray-500">Baths</p>
                </div>
              )}
              {listing.sqft && (
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <Maximize className="w-5 h-5 mx-auto text-gray-400" />
                  <p className="font-semibold mt-1">
                    {listing.sqft.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">sqft</p>
                </div>
              )}
            </div>

            {/* Extra details */}
            <div className="mt-4 space-y-2 text-sm">
              {listing.availableDate && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  Available{" "}
                  {new Date(listing.availableDate).toLocaleDateString()}
                </div>
              )}
              {listing.leaseTerm && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {listing.leaseTerm} lease
                </div>
              )}
              {listing.petPolicy && (
                <div className="flex items-center gap-2 text-gray-600">
                  {listing.petPolicy}
                </div>
              )}
            </div>

            {/* Contact info */}
            {(listing.contactName ||
              listing.contactEmail ||
              listing.contactPhone) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Contact
                </h3>
                {listing.contactName && (
                  <p className="text-sm text-gray-600">{listing.contactName}</p>
                )}
                {listing.contactEmail && (
                  <button
                    onClick={() =>
                      copyToClipboard(listing.contactEmail!, "email")
                    }
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mt-1 transition"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    {listing.contactEmail}
                    {copied === "email" ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                )}
                {listing.contactPhone && (
                  <button
                    onClick={() =>
                      copyToClipboard(listing.contactPhone!, "phone")
                    }
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mt-1 transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    {listing.contactPhone}
                    {copied === "phone" ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 space-y-2">
              <Button className="w-full" size="lg" onClick={handleContact}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Reach Out with AI
              </Button>
              <Button variant="secondary" className="w-full" size="lg">
                <Plus className="w-4 h-4 mr-2" />
                Add to Shortlist
              </Button>
              {listing.sourceUrl && (
                <a
                  href={listing.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" className="w-full" size="lg">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Original Listing
                  </Button>
                </a>
              )}
            </div>

            {/* Timestamps */}
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400 space-y-1">
              {listing.postedAt && <p>Posted {timeAgo(listing.postedAt)}</p>}
              <p>Scraped {timeAgo(listing.scrapedAt)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
