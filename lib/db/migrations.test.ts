import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const drizzleDir = join(process.cwd(), "drizzle");
const metaDir = join(drizzleDir, "meta");

describe("Drizzle migration metadata", () => {
  it("registers every numbered SQL migration in the journal", () => {
    const migrationTags = readdirSync(drizzleDir)
      .filter((file) => /^\d{4}_.+\.sql$/.test(file))
      .map((file) => file.replace(/\.sql$/, ""))
      .sort();

    const journal = JSON.parse(readFileSync(join(metaDir, "_journal.json"), "utf8")) as {
      entries: Array<{ tag: string }>;
    };
    const journalTags = journal.entries.map((entry) => entry.tag).sort();

    expect(journalTags).toEqual(migrationTags);
  });

  it("keeps a snapshot for the latest migration so db:generate has a current baseline", () => {
    const latestMigration = readdirSync(drizzleDir)
      .filter((file) => /^\d{4}_.+\.sql$/.test(file))
      .sort()
      .at(-1);

    expect(latestMigration).toBeDefined();
    const latestIdx = latestMigration?.slice(0, 4);
    const snapshotFiles = readdirSync(metaDir);

    expect(snapshotFiles).toContain(`${latestIdx}_snapshot.json`);
  });
});
