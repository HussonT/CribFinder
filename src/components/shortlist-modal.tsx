"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Check, Loader2 } from "lucide-react";

interface ShortlistOption {
  id: string;
  name: string;
  _count: { listings: number };
}

interface ShortlistModalProps {
  listingId: string;
  open: boolean;
  onClose: () => void;
  onAdded?: (shortlistId: string) => void;
}

export function ShortlistModal({
  listingId,
  open,
  onClose,
  onAdded,
}: ShortlistModalProps) {
  const [shortlists, setShortlists] = useState<ShortlistOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [addedTo, setAddedTo] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      setAddedTo(new Set());
      fetch("/api/shortlists")
        .then((r) => r.json())
        .then(setShortlists)
        .finally(() => setLoading(false));
    }
  }, [open]);

  const addToShortlist = async (shortlistId: string) => {
    setAdding(shortlistId);
    try {
      await fetch(`/api/shortlists/${shortlistId}/listings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      setAddedTo((prev) => new Set(prev).add(shortlistId));
      onAdded?.(shortlistId);
    } finally {
      setAdding(null);
    }
  };

  const createAndAdd = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/shortlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const shortlist = await res.json();
      setShortlists((prev) => [shortlist, ...prev]);
      setNewName("");
      await addToShortlist(shortlist.id);
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl border border-gray-200 shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-lg">Save to Shortlist</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Create new */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex gap-2">
            <Input
              placeholder="New shortlist name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createAndAdd()}
            />
            <Button
              size="sm"
              onClick={createAndAdd}
              disabled={creating || !newName.trim()}
            >
              {creating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Shortlist options */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : shortlists.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              No shortlists yet — create one above
            </p>
          ) : (
            shortlists.map((sl) => (
              <button
                key={sl.id}
                onClick={() => !addedTo.has(sl.id) && addToShortlist(sl.id)}
                disabled={adding === sl.id || addedTo.has(sl.id)}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition text-left disabled:opacity-60"
              >
                <div>
                  <p className="font-medium text-sm">{sl.name}</p>
                  <p className="text-xs text-gray-400">
                    {sl._count.listings} listings
                  </p>
                </div>
                {adding === sl.id ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                ) : addedTo.has(sl.id) ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Plus className="w-4 h-4 text-gray-400" />
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
