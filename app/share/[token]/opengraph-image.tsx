/**
 * Auto-generated OG image (1200x630) for shared scans. Editorial style on
 * dark surface — wordmark + hostname + 3 score tiles. Indexed by token so
 * it survives caching at Vercel's edge.
 *
 * Uses Next.js Metadata API: any file named opengraph-image.tsx in a route
 * segment is automatically used for og:image of pages in that segment.
 */
import { ImageResponse } from "next/og";
import { resolveShareToken } from "@/lib/scan/share";
import { getScanHeader } from "@/lib/scan/queries";

export const runtime = "nodejs";

export const alt = "GEOlens audit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({ params }: { params: { token: string } }) {
  const resolved = await resolveShareToken(params.token);
  const scan = resolved ? await getScanHeader(resolved.scanId) : null;

  const hostname = scan?.hostname ?? "geolens.xyz";
  const seo = scan?.scoreSeo ?? null;
  const aeo = scan?.scoreAeo ?? null;
  const citation = scan?.citationRatePct ?? null;
  const auditNo =
    scan?.id?.split("-")[0]?.toUpperCase().slice(0, 8) ?? "GEOLENS";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0A0A0B",
          color: "#EDEDEF",
          padding: "80px 90px",
          fontFamily: "Inter, sans-serif",
        }}
      >
        {/* masthead */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 14,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#8C8C92",
                fontFamily: "monospace",
              }}
            >
              Audit No. {auditNo} · Shared
            </div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                marginTop: 8,
                fontFamily: "Georgia, 'Times New Roman', serif",
                letterSpacing: "-0.02em",
                display: "flex",
                alignItems: "center",
                gap: 18,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle at 50% 50%, #7C5CFF 0%, #5B3FE5 35%, transparent 70%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.85)",
                }}
              >
                <div
                  style={{ width: 6, height: 6, borderRadius: 999, background: "#fff" }}
                />
              </div>
              GEOlens
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div
              style={{
                fontSize: 14,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#8C8C92",
                fontFamily: "monospace",
              }}
            >
              Specimen
            </div>
            <div style={{ fontSize: 26, fontFamily: "monospace", marginTop: 4 }}>
              {hostname}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            height: 1,
            background: "rgba(255,255,255,0.10)",
            margin: "32px 0",
          }}
        />

        {/* headline */}
        <div
          style={{
            fontSize: 72,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            display: "flex",
          }}
        >
          A second opinion on how AI sees {hostname}.
        </div>

        {/* score tiles */}
        <div style={{ display: "flex", gap: 18, marginTop: "auto" }}>
          <Tile label="SEO" value={seo} suffix="" />
          <Tile label="AEO" value={aeo} suffix="" />
          <Tile label="Citation rate" value={citation} suffix="%" />
        </div>
      </div>
    ),
    { ...size },
  );
}

function Tile({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null;
  suffix: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "#111113",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 16,
        padding: 24,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontSize: 14,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#8C8C92",
          fontFamily: "monospace",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 80,
          fontFamily: "monospace",
          fontWeight: 600,
          marginTop: 8,
          color: toneColor(value, label),
          display: "flex",
        }}
      >
        {value === null ? "—" : `${value}${suffix}`}
      </div>
    </div>
  );
}

function toneColor(value: number | null, label: string): string {
  if (value === null) return "#8C8C92";
  const good = label === "Citation rate" ? 70 : 80;
  const ok = label === "Citation rate" ? 40 : 50;
  if (value >= good) return "#3CCB7F";
  if (value >= ok) return "#F5A524";
  return "#F25555";
}
