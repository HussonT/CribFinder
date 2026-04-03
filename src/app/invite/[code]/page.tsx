"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState("");
  const [shortlistId, setShortlistId] = useState<string | null>(null);

  useEffect(() => {
    acceptInvite();
  }, []);

  const acceptInvite = async () => {
    try {
      const res = await fetch("/api/invite", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatus("success");
        setShortlistId(data.shortlistId);
      } else {
        const data = await res.json();
        setStatus("error");
        setError(data.error ?? "Invalid invite");
      }
    } catch {
      setStatus("error");
      setError("Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-gray-400 mx-auto" />
            <p className="text-gray-600 mt-4">Accepting invite...</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <h1 className="text-xl font-bold mt-4">You&apos;re in!</h1>
            <p className="text-gray-500 mt-2">
              You&apos;ve been added to the shortlist. Time to find your crib.
            </p>
            <Button
              className="mt-6"
              onClick={() =>
                router.push(
                  shortlistId
                    ? `/shortlists/${shortlistId}`
                    : "/shortlists"
                )
              }
            >
              View Shortlist
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-xl font-bold mt-4">Invite Failed</h1>
            <p className="text-gray-500 mt-2">{error}</p>
            <Button
              variant="secondary"
              className="mt-6"
              onClick={() => router.push("/listings")}
            >
              Go to Listings
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
