"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Link as LinkIcon, Loader2 } from "lucide-react";
import Link from "next/link";

interface Shortlist {
  id: string;
  name: string;
  members: Array<{
    user: { id: string; name: string | null; image: string | null };
    role: string;
  }>;
  _count: { listings: number; members: number };
}

export default function ShortlistsPage() {
  const [shortlists, setShortlists] = useState<Shortlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetch("/api/shortlists")
      .then((r) => r.json())
      .then(setShortlists)
      .finally(() => setLoading(false));
  }, []);

  const createShortlist = async () => {
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
    } finally {
      setCreating(false);
    }
  };

  const copyInviteLink = async (shortlistId: string) => {
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shortlists</h1>
          <p className="text-sm text-gray-500 mt-1">
            Organize and share your favorite listings with friends
          </p>
        </div>
      </div>

      {/* Create new */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex gap-2">
          <Input
            placeholder="New shortlist name (e.g. West Village Under $4k)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createShortlist()}
          />
          <Button onClick={createShortlist} disabled={creating || !newName.trim()}>
            <Plus className="w-4 h-4 mr-1" />
            Create
          </Button>
        </div>
      </div>

      {/* Shortlist cards */}
      {shortlists.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">No shortlists yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Create one and start saving listings!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {shortlists.map((sl) => (
            <Link
              key={sl.id}
              href={`/shortlists/${sl.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-lg">{sl.name}</h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    <span>{sl._count.listings} listings</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {sl._count.members} members
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Member avatars */}
                  <div className="flex -space-x-2">
                    {sl.members.slice(0, 4).map((m) => (
                      <div
                        key={m.user.id}
                        className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600"
                        title={m.user.name ?? ""}
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

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      copyInviteLink(sl.id);
                    }}
                  >
                    <LinkIcon className="w-3.5 h-3.5 mr-1" />
                    Invite
                  </Button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
