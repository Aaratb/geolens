import type { ScanFixPack } from "@/lib/db/schema";
import type { ScanWithDetails } from "@/lib/scan/queries";
import { generateFixPackPayload, type GeneratedFixPack } from "./generate";
import { type FixPackPayload, parseFixPackPayload } from "./schema";
import {
  getFixPackByScanId,
  markFixPackCompleted,
  markFixPackFailed,
  STALE_FIX_PACK_GENERATION_MS,
  startGeneratingFixPack,
} from "./store";

export class InvalidPersistedFixPackError extends Error {
  constructor() {
    super("INVALID_PERSISTED_FIX_PACK");
    this.name = "InvalidPersistedFixPackError";
  }
}

interface CompletedFixPackResult {
  status: "completed";
  fixPack: ScanFixPack;
  payload: FixPackPayload;
  generated: boolean;
  model: string | null;
  costCents: number | null;
}

interface GeneratingFixPackResult {
  status: "generating";
  fixPack: ScanFixPack;
  payload: null;
  generated: false;
  model: null;
  costCents: null;
}

export type GenerateOrGetFixPackResult = CompletedFixPackResult | GeneratingFixPackResult;

interface FixPackStore {
  getByScanId: typeof getFixPackByScanId;
  startGenerating: typeof startGeneratingFixPack;
  markCompleted: typeof markFixPackCompleted;
  markFailed: typeof markFixPackFailed;
}

export interface GenerateOrGetFixPackOptions {
  requestedBy?: string | null;
  store?: FixPackStore;
  generator?: (input: ScanWithDetails) => Promise<GeneratedFixPack>;
  onGenerationStarted?: (row: ScanFixPack) => void | Promise<void>;
}

const defaultStore: FixPackStore = {
  getByScanId: getFixPackByScanId,
  startGenerating: startGeneratingFixPack,
  markCompleted: markFixPackCompleted,
  markFailed: markFixPackFailed,
};

export async function generateOrGetFixPack(
  scan: ScanWithDetails,
  opts: GenerateOrGetFixPackOptions = {},
): Promise<GenerateOrGetFixPackResult> {
  const store = opts.store ?? defaultStore;
  const existing = await store.getByScanId(scan.header.id);

  if (existing?.status === "completed") {
    return {
      status: "completed",
      fixPack: existing,
      payload: parsePersistedPayload(existing.payload),
      generated: false,
      model: existing.model,
      costCents: existing.costCents,
    };
  }

  if (existing?.status === "generating") {
    if (!isStaleGeneratingFixPack(existing)) {
      return generatingResult(existing);
    }
  }

  const generation = await store.startGenerating({
    scanId: scan.header.id,
    requestedBy: opts.requestedBy ?? null,
  });
  const row = generation.row;

  if (!generation.started) {
    if (row.status === "completed") {
      return {
        status: "completed",
        fixPack: row,
        payload: parsePersistedPayload(row.payload),
        generated: false,
        model: row.model,
        costCents: row.costCents,
      };
    }

    if (row.status !== "generating") {
      throw new Error("FIX_PACK_UNEXPECTED_STATUS");
    }

    return generatingResult(row);
  }

  try {
    await opts.onGenerationStarted?.(row);
    const generated = await (opts.generator ?? generateFromScanDetails)(scan);
    const completed = await store.markCompleted({
      id: row.id,
      payload: generated.payload,
      model: generated.model,
      costCents: generated.costCents,
    });

    return {
      status: "completed",
      fixPack: completed,
      payload: generated.payload,
      generated: true,
      model: generated.model,
      costCents: generated.costCents,
    };
  } catch (err) {
    await store.markFailed({
      id: row.id,
      error: safeGenerationError(err),
    });
    throw err;
  }
}

async function generateFromScanDetails(scan: ScanWithDetails): Promise<GeneratedFixPack> {
  return generateFixPackPayload({
    header: scan.header,
    findings: scan.findings,
    probes: scan.probes,
  });
}

function parsePersistedPayload(payload: unknown): FixPackPayload {
  try {
    return parseFixPackPayload(payload);
  } catch {
    throw new InvalidPersistedFixPackError();
  }
}

function isStaleGeneratingFixPack(row: ScanFixPack): boolean {
  return Date.now() - row.updatedAt.getTime() > STALE_FIX_PACK_GENERATION_MS;
}

function generatingResult(row: ScanFixPack): GeneratingFixPackResult {
  return {
    status: "generating",
    fixPack: row,
    payload: null,
    generated: false,
    model: null,
    costCents: null,
  };
}

export function safeGenerationError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return message.slice(0, 500);
}
