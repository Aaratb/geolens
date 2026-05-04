import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { extractIp, hashIp, limitFixPackEvents } from "@/lib/rate-limit";
import {
  buildFixPackClientTelemetryProps,
  FixPackClientTelemetryBody,
} from "@/lib/telemetry/fixpack-client";
import { track } from "@/lib/telemetry/track";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = FixPackClientTelemetryBody.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const user = await getCurrentUser();
  const ipHash = hashIp(extractIp(req.headers));
  const limit = await limitFixPackEvents(ipHash);
  if (!limit.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  track({
    event: body.data.event,
    userId: user?.id ?? null,
    anonId: user ? null : ipHash,
    props: {
      ...buildFixPackClientTelemetryProps(body.data),
      anonymous: !user,
    },
  });

  return NextResponse.json({ ok: true });
}
