import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return "Price N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(date);
}

export function generateFingerprint(listing: {
  address?: string | null;
  price?: number | null;
  bedrooms?: number | null;
}): string {
  const parts = [
    listing.address?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "",
    listing.price?.toString() ?? "",
    listing.bedrooms?.toString() ?? "",
  ];
  return parts.join("|");
}

// Downtown Manhattan neighborhoods we care about
export const TARGET_NEIGHBORHOODS = [
  "West Village",
  "Greenwich Village",
  "SoHo",
  "NoHo",
  "Chelsea",
  "Flatiron",
  "Meatpacking District",
  "Hudson Square",
  "NoLita",
  "Little Italy",
  "Tribeca",
] as const;

export type Neighborhood = (typeof TARGET_NEIGHBORHOODS)[number];
