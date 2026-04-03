export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/listings/:path*",
    "/shortlists/:path*",
    "/inbox/:path*",
    "/settings/:path*",
    "/api/listings/:path*",
    "/api/shortlists/:path*",
    "/api/conversations/:path*",
    "/api/messages/:path*",
    "/api/scrape/:path*",
    "/api/invite/:path*",
  ],
};
