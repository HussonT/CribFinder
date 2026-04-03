"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShortlistListingCard } from "@/components/listings/listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Link as LinkIcon,
  Users,
  MessageSquare,
  Loader2,
  Send,
} from "lucide-react";
import Link from "next/link";
import type { Listing } from "@/generated/prisma";

interface ShortlistData {
  id: string;
  name: string;
  members: Array<{
    user: { id: string; name: string | null; image: string | null };
    role: string;
  }>;
  listings: Array<{
    id: string;
    listingId: string;
    status: string;
    listing: Listing;
    votes: Array<{ value: number; userId: string }>;
    _count: { comments: number };
  }>;
}

export default function ShortlistDetailPage() {
  const params = useParams();
  const shortlistId = params.id as string;
  const [data, setData] = useState<ShortlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    fetch("/api/shortlists")
      .then((r) => r.json())
      .then((shortlists: ShortlistData[]) => {
        const found = shortlists.find((s) => s.id === shortlistId);
        setData(found ?? null);
      })
      .finally(() => setLoading(false));
  }, [shortlistId]);

  const handleVote = async (listingId: string, value: number) => {
    await fetch(
      `/api/shortlists/${shortlistId}/listings/${listingId}/vote`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value }),
      }
    );
    // Refresh
    const res = await fetch("/api/shortlists");
    const shortlists = await res.json();
    setData(shortlists.find((s: ShortlistData) => s.id === shortlistId) ?? null);
  };

  const handleStatusChange = async (listingId: string, status: string) => {
    await fetch(`/api/shortlists/${shortlistId}/listings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, status }),
    });
  };

  const handleComment = async (listingId: string) => {
    const content = commentInputs[listingId];
    if (!content?.trim()) return;

    await fetch(
      `/api/shortlists/${shortlistId}/listings/${listingId}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      }
    );

    setCommentInputs((prev) => ({ ...prev, [listingId]: "" }));
  };

  const copyInviteLink = async () => {
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shortlistId }),
    });
    const { url } = await res.json();
    await navigator.clipboard.writeText(url);
    alert("Invite link copied!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Shortlist not found</p>
        <Link href="/shortlists" className="text-sm text-blue-600 mt-2 block">
          Back to shortlists
        </Link>
      </div>
    );
  }

  // Group by status for pipeline view
  const statusOrder = [
    "NEW",
    "INTERESTED",
    "CONTACTED",
    "TOUR_SCHEDULED",
    "APPLIED",
    "ACCEPTED",
    "REJECTED",
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/shortlists"
          className="p-2 hover:bg-gray-100 rounded-lg transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
            <span>{data.listings.length} listings</span>
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {data.members.length} members
            </span>
          </div>
        </div>

        {/* Member avatars */}
        <div className="flex -space-x-2 mr-2">
          {data.members.map((m) => (
            <div
              key={m.user.id}
              className="w-9 h-9 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-sm font-medium text-gray-600"
              title={`${m.user.name ?? "?"} (${m.role})`}
            >
              {m.user.image ? (
                <img
                  src={m.user.image}
                  alt=""
                  className="w-full h-full rounded-full"
                />
              ) : (
                (m.user.name?.[0] ?? "?").toUpperCase()
              )}
            </div>
          ))}
        </div>

        <Button variant="secondary" onClick={copyInviteLink}>
          <LinkIcon className="w-4 h-4 mr-1" />
          Invite Friends
        </Button>
      </div>

      {/* Pipeline summary */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {statusOrder.map((status) => {
          const count = data.listings.filter(
            (l) => l.status === status
          ).length;
          if (count === 0) return null;
          return (
            <Badge key={status} variant="default" className="whitespace-nowrap">
              {status.replace(/_/g, " ")} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Listings */}
      {data.listings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500">No listings yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Browse listings and save your favorites here
          </p>
          <Link href="/listings">
            <Button className="mt-4">Browse Listings</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.listings.map((entry) => (
            <div key={entry.id}>
              <ShortlistListingCard
                listing={entry.listing}
                status={entry.status}
                votes={entry.votes}
                commentCount={entry._count.comments}
                onVote={(value) => handleVote(entry.listingId, value)}
                onStatusChange={(status) =>
                  handleStatusChange(entry.listingId, status)
                }
              />
              {/* Comment input */}
              <div className="flex gap-2 mt-1 ml-32 pl-3">
                <Input
                  placeholder="Add a comment..."
                  value={commentInputs[entry.listingId] ?? ""}
                  onChange={(e) =>
                    setCommentInputs((prev) => ({
                      ...prev,
                      [entry.listingId]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleComment(entry.listingId)
                  }
                  className="text-sm h-8"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleComment(entry.listingId)}
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
