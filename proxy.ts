import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/v1/me(.*)",
  "/api/v1/share(.*)",
  "/api/v1/scans/(.*)/pdf",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals + static assets + the Clerk webhook (Clerk's
    // own POSTs come without a session cookie; we verify Svix-signed bodies
    // directly in the handler).
    "/((?!_next|api/webhooks/|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/((?!api/webhooks/)(api|trpc))(.*)",
  ],
};
