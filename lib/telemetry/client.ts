import type { FixPackClientTelemetryInput } from "./fixpack-client";

export function trackFixPackClientEvent(input: FixPackClientTelemetryInput): void {
  if (typeof window === "undefined") return;

  const body = JSON.stringify(input);
  if (navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon("/api/v1/fix-pack/events", blob)) return;
  }

  void fetch("/api/v1/fix-pack/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch((err) => {
    console.warn("[telemetry] fixpack client event failed", err);
  });
}
