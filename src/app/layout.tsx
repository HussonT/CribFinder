import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CribFinder - Find Your NYC Apartment",
  description:
    "Collaborative apartment hunting for you and your friends. Aggregates Craigslist, StreetEasy, Zillow and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gray-50 antialiased" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
