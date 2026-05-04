/**
 * No-op Drizzle db stub for tests. Lets us exercise persistence call sites
 * without hitting Postgres. Every chain method returns `this`; .returning()
 * resolves to [].
 */
import type { Db } from "./client";

interface ChainStub {
  set(_v?: unknown): ChainStub;
  where(_c?: unknown): ChainStub;
  values(_v?: unknown): ChainStub;
  returning(): Promise<unknown[]>;
  then<T>(onFulfilled: (v: unknown[]) => T): Promise<T>;
}

const chain: ChainStub = {
  set: () => chain,
  where: () => chain,
  values: () => chain,
  returning: async () => [],
  // Make awaiting a chain resolve like an empty array
  then: (resolve) => Promise.resolve(resolve([])),
};

export function stubDb(): Db {
  const stub = {
    update: () => chain,
    insert: () => chain,
    select: () => chain,
    delete: () => chain,
    // transaction(callback) immediately invokes the callback with the same
    // stub so chained writes inside a tx are no-ops in tests.
    transaction: async <T>(cb: (tx: unknown) => Promise<T>): Promise<T> => cb(stub),
  };
  return stub as unknown as Db;
}
