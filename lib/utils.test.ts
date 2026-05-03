import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("merges tailwind classes preferring later utilities", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("filters falsy values", () => {
    const flag: boolean = false;
    expect(cn("p-2", flag && "p-4", null, undefined)).toBe("p-2");
  });
});
