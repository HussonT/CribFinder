"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ShortlistListingCard } from "@/components/listings/listing-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Link as LinkIcon,
  Users,
  Loader2,
  Send,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import type { Listing } from "@/lib/db/types";

interface CommentData {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
}

interface ShortlistEntry {
  id: string;
  listingId: string;
  status: string;
  listing: Listing;
  votes: Array<{ value: number; userId: string }>;
  comments: CommentData[];
}

interface ShortlistData {
  id: string;
  name: string;
  members: Array<{
    user: { id: string; name: string | null; image: string | null };
    role: string;
    userId: string;
  }>;
  listings: ShortlistEntry[];
}

export default function ShortlistDetailPage() {
  const params = useParams();
  const router = useRouter();
  const shortlistId = params.id as string;
  const [data, setData] = useState<ShortlistData | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/shortlists/${shortlistId}`);
      if (res.ok) {
        setData(await res.json());
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [shortlistId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleVote = async (listingId: string, value: number) => {
    await fetch(`/api/shortlists/${shortlistId}/listings/${listingId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    fetchData();
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

    await fetch(`/api/shortlists/${shortlistId}/listings/${listingId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    setCommentInputs((prev) => ({ ...prev, [listingId]: "" }));
    fetchData();
  };

  const handleRemoveListing = async (listingId: string) => {
    await fetch(`/api/shortlists/${shortlistId}/listings`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId }),
    });
    fetchData();
  };

  const handleDeleteShortlist = async () => {
    await fetch(`/api/shortlists/${shortlistId}`, { method: "DELETE" });
    router.push("/shortlists");
  };

  const copyInviteLink = async () => {
    const res = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shortlistId }),
    });
    const { url } = await res.json();
    await navigator.clipboard.writeText(url);
  };

  const toggleComments = (listingId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(listingId)) next.delete(listingId);
      else next.add(listingId);
      return next;
    });
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

  const statusOrder = [
    "NEW",
    "INTERESTED",
    "CONTACTED",
    "TOUR_SCHEDULED",
    "APPLIED",
    "ACCEPTED",
    "REJECTED",
    "ARCHIVED",
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/shortlists" className="p-2 hover:bg-gray-100 rounded-lg transition">
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

        <div className="flex -space-x-2 mr-2">
          {data.members.map((m) => (
            <div
              key={m.user.id}
              className="w-9 h-9 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-sm font-medium text-gray-600"
              title={`${m.user.name ?? "?"} (${m.role})`}
            >
              {m.user.image ? (
                <img src={m.user.image} alt="" className="w-full h-full rounded-full" />
              ) : (
                (m.user.name?.[0] ?? "?").toUpperCase()
              )}
            </div>
          ))}
        </div>

        <Button variant="secondary" onClick={copyInviteLink}>
          <LinkIcon className="w-4 h-4 mr-1" />
          Invite
        </Button>
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <Button variant="danger" size="sm" onClick={handleDeleteShortlist}>
              Confirm Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Pipeline summary */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {statusOrder.map((status) => {
          const count = data.listings.filter((l) => l.status === status).length;
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
        <div className="space-y-4">
          {data.listings.map((entry) => (
            <div key={entry.id} className="relative group">
              {/* Remove button */}
              <button
                onClick={() => handleRemoveListing(entry.listingId)}
                className="absolute -right-2 -top-2 z-10 bg-white border border-gray-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                title="Remove from shortlist"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <ShortlistListingCard
                listing={entry.listing}
                status={entry.status}
                votes={entry.votes}
                commentCount={entry.comments.length}
                onVote={(value) => handleVote(entry.listingId, value)}
                onStatusChange={(status) => handleStatusChange(entry.listingId, status)}
              />

              {/* Comments section */}
              <div className="ml-32 pl-3 mt-1">
                {entry.comments.length > 0 && (
                  <button
                    onClick={() => toggleComments(entry.listingId)}
                    className="text-xs text-gray-500 hover:text-gray-700 mb-1"
                  >
                    {expandedComments.has(entry.listingId)
                      ? "Hide comments"
                      : `${entry.comments.length} comment${entry.comments.length !== 1 ? "s" : ""}`}
                  </button>
                )}

                {expandedComments.has(entry.listingId) && (
                  <div className="space-y-2 mb-2">
                    {entry.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="flex items-start gap-2 text-sm"
                      >
                        <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-medium shrink-0 mt-0.5">
                          {comment.user.image ? (
                            <img
                              src={comment.user.image}
                              alt=""
                              className="w-full h-full rounded-full"
                            />
                          ) : (
                            (comment.user.name?.[0] ?? "?").toUpperCase()
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">
                            {comment.user.name ?? "Someone"}
                          </span>
                          <span className="text-gray-500 ml-1.5">
                            {comment.content}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comment input */}
                <div className="flex gap-2">
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
                    disabled={!commentInputs[entry.listingId]?.trim()}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
