import { withAuth } from "next-auth/middleware";
import type { NextRequestWithAuth } from "next-auth/middleware";
import type { NextFetchEvent } from "next/server";

const authMiddleware = withAuth({
  pages: {
    signIn: "/login"
  }
});

export function middleware(request: NextRequestWithAuth, event: NextFetchEvent) {
  return authMiddleware(request, event);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/customers/:path*",
    "/files/:path*",
    "/invoices/:path*",
    "/api/profile/:path*",
    "/api/customers/:path*",
    "/api/invoices/:path*",
    "/api/files/:path*"
  ]
};
