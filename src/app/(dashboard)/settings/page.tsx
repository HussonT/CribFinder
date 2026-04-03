"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { TARGET_NEIGHBORHOODS } from "@/lib/utils";
import { Save, RefreshCw, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>(
    [...TARGET_NEIGHBORHOODS]
  );
  const [maxBudget, setMaxBudget] = useState("5000");
  const [minBedrooms, setMinBedrooms] = useState("1");
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<string | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(true);

  // Load saved preferences
  useEffect(() => {
    fetch("/api/users/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data?.searchPreferences) {
          const prefs = data.searchPreferences as Record<string, unknown>;
          if (Array.isArray(prefs.neighborhoods))
            setSelectedNeighborhoods(prefs.neighborhoods as string[]);
          if (prefs.maxBudget) setMaxBudget(String(prefs.maxBudget));
          if (prefs.minBedrooms) setMinBedrooms(String(prefs.minBedrooms));
        }
        if (data?.whatsappId) setWhatsappNumber(data.whatsappId);
      })
      .catch(() => {})
      .finally(() => setLoadingPrefs(false));
  }, []);

  const toggleNeighborhood = (n: string) => {
    setSelectedNeighborhoods((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/users/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          searchPreferences: {
            neighborhoods: selectedNeighborhoods,
            maxBudget: parseInt(maxBudget),
            minBedrooms: parseInt(minBedrooms),
          },
          whatsappId: whatsappNumber || null,
        }),
      });
      toast("Settings saved!", "success");
    } catch {
      toast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    setScrapeResult(null);
    toast("Scraping started — this may take a minute", "info");
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          neighborhoods: selectedNeighborhoods,
          maxPrice: parseInt(maxBudget) * 100,
          minBedrooms: parseInt(minBedrooms),
        }),
      });
      const result = await res.json();
      const summary = `Found ${result.total} listings: ${Object.entries(result.bySource)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")}`;
      setScrapeResult(summary);
      toast(summary, "success");
    } catch {
      setScrapeResult("Scrape failed. Check console for details.");
      toast("Scrape failed", "error");
    } finally {
      setScraping(false);
    }
  };

  if (loadingPrefs) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Search Preferences */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Search Preferences</h2>
        <div className="space-y-4">
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
                    selectedNeighborhoods.includes(n)
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Budget ($/month)
              </label>
              <Input
                type="number"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Bedrooms
              </label>
              <Input
                type="number"
                value={minBedrooms}
                onChange={(e) => setMinBedrooms(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">WhatsApp Notifications</h2>
        <p className="text-sm text-gray-500 mb-3">
          Get instant alerts when new listings match your search or when
          landlords reply.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp Phone Number
          </label>
          <Input
            type="tel"
            placeholder="+1 (212) 555-1234"
            value={whatsappNumber}
            onChange={(e) => setWhatsappNumber(e.target.value)}
          />
          <p className="text-xs text-gray-400 mt-1">
            Include country code. We&apos;ll send you a verification message.
          </p>
        </div>
      </section>

      {/* Scraping Controls */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Scraping</h2>
        <p className="text-sm text-gray-500 mb-3">
          Manually trigger a scrape of all sources for your selected
          neighborhoods.
        </p>
        <Button onClick={handleScrape} disabled={scraping}>
          {scraping ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1" />
          )}
          {scraping ? "Scraping..." : "Run Scrape Now"}
        </Button>
        {scrapeResult && (
          <p className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded-lg">
            {scrapeResult}
          </p>
        )}
      </section>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-1" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}
