"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, timeAgo } from "@/lib/utils";
import {
  Send,
  Sparkles,
  Calendar,
  HelpCircle,
  Heart,
  X,
  Loader2,
  User,
} from "lucide-react";
import type { Listing, Conversation, Message } from "@/generated/prisma";

interface ConversationWithRelations extends Conversation {
  listing: Pick<
    Listing,
    "id" | "title" | "neighborhood" | "price" | "images" | "sourceUrl"
  >;
  assignedTo: { id: string; name: string | null; image: string | null } | null;
  messages: Message[];
  _count: { messages: number };
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>}>
      <InboxContent />
    </Suspense>
  );
}

function InboxContent() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<
    ConversationWithRelations[]
  >([]);
  const [selected, setSelected] = useState<string | null>(
    searchParams.get("conversation")
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState(
    searchParams.get("draft")
      ? decodeURIComponent(searchParams.get("draft")!)
      : ""
  );
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => {
        setConversations(data);
        if (!selected && data.length > 0) {
          setSelected(data[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedConv = conversations.find((c) => c.id === selected);

  const sendMessage = async () => {
    if (!draft.trim() || !selected) return;
    setSending(true);
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selected,
          content: draft,
          aiDrafted: false,
        }),
      });
      setDraft("");
      // Refresh
      const res = await fetch("/api/conversations");
      setConversations(await res.json());
    } finally {
      setSending(false);
    }
  };

  const requestAiReply = async (
    intent: "schedule_tour" | "ask_questions" | "express_interest" | "decline"
  ) => {
    if (!selected) return;
    setAiLoading(true);
    try {
      const res = await fetch("/api/messages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "suggest_reply",
          conversationId: selected,
          intent,
        }),
      });
      const { suggestion } = await res.json();
      setDraft(suggestion);
    } finally {
      setAiLoading(false);
    }
  };

  const statusColors: Record<string, "info" | "warning" | "success" | "danger"> = {
    NEEDS_RESPONSE: "danger",
    WAITING: "warning",
    CLOSED: "default" as "info",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3rem)] -m-6">
      {/* Conversation list */}
      <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <h1 className="text-lg font-bold">Inbox</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {conversations.length} conversations
          </p>
        </div>

        {conversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-gray-400">
            No conversations yet. Reach out to a listing to start one.
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelected(conv.id)}
              className={`w-full p-4 text-left border-b border-gray-50 hover:bg-gray-50 transition ${
                selected === conv.id ? "bg-gray-50" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 overflow-hidden">
                  {conv.listing.images[0] ? (
                    <img
                      src={conv.listing.images[0]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm truncate">
                      {conv.listing.title}
                    </p>
                    <Badge
                      variant={statusColors[conv.status] ?? "info"}
                      className="text-[10px] shrink-0 ml-2"
                    >
                      {conv.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">
                    {conv.listing.neighborhood} ·{" "}
                    {formatPrice(conv.listing.price)}
                  </p>
                  {conv.messages[0] && (
                    <p className="text-xs text-gray-400 truncate mt-1">
                      {conv.messages[0].content.slice(0, 60)}...
                    </p>
                  )}
                </div>
              </div>
              {conv.assignedTo && (
                <div className="flex items-center gap-1 mt-2 text-xs text-gray-400">
                  <User className="w-3 h-3" />
                  Assigned to {conv.assignedTo.name ?? "someone"}
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Message thread */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedConv ? (
          <>
            {/* Thread header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{selectedConv.listing.title}</h2>
                <p className="text-sm text-gray-500">
                  {selectedConv.listing.neighborhood} ·{" "}
                  {formatPrice(selectedConv.listing.price)}
                  {selectedConv.listing.sourceUrl && (
                    <>
                      {" · "}
                      <a
                        href={selectedConv.listing.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        View listing
                      </a>
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusColors[selectedConv.status] ?? "info"}>
                  {selectedConv.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedConv.messages.length === 0 && !draft ? (
                <div className="text-center py-8 text-sm text-gray-400">
                  No messages yet. Write your first message below.
                </div>
              ) : (
                selectedConv.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-md rounded-2xl px-4 py-3 ${
                        msg.direction === "OUTBOUND"
                          ? "bg-black text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      <div
                        className={`flex items-center gap-2 mt-1 text-xs ${
                          msg.direction === "OUTBOUND"
                            ? "text-gray-400"
                            : "text-gray-500"
                        }`}
                      >
                        <span>{timeAgo(msg.sentAt)}</span>
                        {msg.aiDrafted && (
                          <span className="flex items-center gap-0.5">
                            <Sparkles className="w-3 h-3" />
                            AI drafted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* AI quick reply buttons */}
            <div className="px-4 py-2 border-t border-gray-100 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => requestAiReply("schedule_tour")}
                disabled={aiLoading}
              >
                <Calendar className="w-3.5 h-3.5 mr-1" />
                Schedule Tour
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => requestAiReply("ask_questions")}
                disabled={aiLoading}
              >
                <HelpCircle className="w-3.5 h-3.5 mr-1" />
                Ask Questions
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => requestAiReply("express_interest")}
                disabled={aiLoading}
              >
                <Heart className="w-3.5 h-3.5 mr-1" />
                Express Interest
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => requestAiReply("decline")}
                disabled={aiLoading}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Decline
              </Button>
              {aiLoading && (
                <Loader2 className="w-4 h-4 animate-spin text-gray-400 self-center" />
              )}
            </div>

            {/* Compose */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message..."
                  className="flex-1 resize-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1 min-h-[80px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      sendMessage();
                    }
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">
                  Cmd+Enter to send
                </span>
                <Button onClick={sendMessage} disabled={sending || !draft.trim()}>
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : (
                    <Send className="w-4 h-4 mr-1" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a conversation to view messages
          </div>
        )}
      </div>
    </div>
  );
}
