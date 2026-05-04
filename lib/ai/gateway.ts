/**
 * Single helper to convert a model id string into a LanguageModelV1 via the
 * Vercel AI Gateway. All probe runs and parser calls go through here, so
 * swapping providers later only changes this file.
 *
 * Auth: AI_GATEWAY_API_KEY env var (read by the @ai-sdk/gateway package).
 */
import { gateway } from "@ai-sdk/gateway";

/**
 * Returns a LanguageModel instance for the given model id. We let TS infer
 * the return type so we automatically pick up SDK version bumps without churn.
 */
export function modelFor(id: string) {
  return gateway(id);
}
