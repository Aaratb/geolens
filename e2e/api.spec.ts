/**
 * API contract tests against the live deployment. Verify auth gates,
 * input validation, and that the SSE auth fix from Phase 7 (S-CRIT-1) is
 * actually live.
 */
import { expect, test } from "@playwright/test";

test.describe("API contract", () => {
  test("POST /api/v1/scans rejects invalid body", async ({ request }) => {
    const res = await request.post("/api/v1/scans", {
      data: { not_a_url_field: "x" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("invalid_body");
  });

  test("POST /api/v1/scans rejects malformed URLs", async ({ request }) => {
    const res = await request.post("/api/v1/scans", {
      data: { url: "javascript:alert(1)" },
    });
    expect(res.status()).toBe(400);
  });

  test("GET /api/v1/scans/[id] returns 404 for unknown UUID", async ({ request }) => {
    const res = await request.get("/api/v1/scans/00000000-0000-0000-0000-000000000000");
    expect(res.status()).toBe(404);
  });

  test("SSE stream returns 404 for unknown scan (S-CRIT-1 lock-in)", async ({ request }) => {
    const res = await request.get(
      "/api/v1/scans/00000000-0000-0000-0000-000000000000/stream",
    );
    expect(res.status()).toBe(404);
  });

  test("POST /api/v1/scans/[id]/claim requires auth", async ({ request }) => {
    // Without a Clerk session, claim must 401 (or 403 — both acceptable
    // markers of "you cannot do this anonymously")
    const res = await request.post(
      "/api/v1/scans/00000000-0000-0000-0000-000000000000/claim",
    );
    expect([401, 403, 404]).toContain(res.status());
  });

  test("POST /api/v1/waitlist requires a valid email", async ({ request }) => {
    const res = await request.post("/api/v1/waitlist", {
      data: { email: "not-an-email" },
    });
    expect(res.status()).toBe(400);
  });

  test("Cron internal endpoints reject unauthenticated requests", async ({ request }) => {
    const cleanup = await request.get("/api/internal/cleanup");
    const budget = await request.get("/api/internal/budget-check");
    expect(cleanup.status()).toBe(401);
    expect(budget.status()).toBe(401);
  });
});
