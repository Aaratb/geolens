/**
 * The GEOlens lens mark — a violet aperture with a center dot. Used in the
 * masthead on landing, scan, and share views. Single source of truth so a
 * future logo refresh only touches this file.
 *
 * Phase 7 review (CR-M-2): de-duplicates 3 inline copies across pages.
 */
export function LensMark({ size = 20 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="rounded-full grid place-items-center shrink-0"
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle at 50% 50%, var(--color-accent) 0%, var(--color-accent-deep) 35%, transparent 70%)",
        boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.85)",
      }}
    >
      <span
        className="rounded-full"
        style={{
          width: Math.max(2, Math.round(size * 0.05)),
          height: Math.max(2, Math.round(size * 0.05)),
          background: "#fff",
          boxShadow: "0 0 8px rgba(255,255,255,0.6)",
        }}
      />
    </span>
  );
}
