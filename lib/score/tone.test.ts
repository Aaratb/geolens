import { describe, expect, it } from "vitest";
import { TONE_COLOR_DARK, TONE_COLOR_LIGHT, TONE_LABEL, toneFor } from "./tone";

describe("toneFor", () => {
  it("score thresholds: ≥80 good, ≥50 warn, else bad", () => {
    expect(toneFor(95).tone).toBe("good");
    expect(toneFor(80).tone).toBe("good");
    expect(toneFor(79).tone).toBe("warn");
    expect(toneFor(50).tone).toBe("warn");
    expect(toneFor(49).tone).toBe("bad");
    expect(toneFor(0).tone).toBe("bad");
  });

  it("rate thresholds are looser: ≥70 good, ≥40 warn, else bad", () => {
    expect(toneFor(70, "rate").tone).toBe("good");
    expect(toneFor(69, "rate").tone).toBe("warn");
    expect(toneFor(40, "rate").tone).toBe("warn");
    expect(toneFor(39, "rate").tone).toBe("bad");
  });

  it("returns dark-mode tone color and human label", () => {
    const t = toneFor(95);
    expect(t.color).toBe(TONE_COLOR_DARK.good);
    expect(t.label).toBe(TONE_LABEL.good);
  });

  it("light-mode color table mirrors the dark one", () => {
    expect(Object.keys(TONE_COLOR_LIGHT).sort()).toEqual(Object.keys(TONE_COLOR_DARK).sort());
  });
});
