export { default } from "next-auth/middleware";

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
