import { createHmac } from "node:crypto";

import type { SearchQuery } from "../domain/search";

export type AnonymousSearchMetric = Readonly<{
  filters: Readonly<{
    canonStatuses: readonly string[];
    kinds: readonly string[];
    locale: string | null;
    maxSpoilerLevel: string;
  }>;
  queryFingerprint: string;
  queryLength: number;
  resultCount: number;
  zeroResult: boolean;
}>;

export function createAnonymousSearchMetric(
  query: SearchQuery,
  resultCount: number,
  fingerprintKey: string,
): AnonymousSearchMetric {
  if (fingerprintKey.length < 32) {
    throw new Error("search metric fingerprint key must contain 32 characters");
  }
  if (!Number.isSafeInteger(resultCount) || resultCount < 0) {
    throw new Error("search metric result count must be a nonnegative integer");
  }

  const normalizedTerm = query.term.normalize("NFKC").trim();
  return {
    filters: {
      canonStatuses: [...(query.canonStatuses ?? [])].sort(),
      kinds: [...(query.kinds ?? [])].sort(),
      locale: query.locale ?? null,
      maxSpoilerLevel: query.maxSpoilerLevel,
    },
    queryFingerprint: createHmac("sha256", fingerprintKey)
      .update(normalizedTerm)
      .digest("hex"),
    queryLength: normalizedTerm.length,
    resultCount,
    zeroResult: resultCount === 0,
  };
}
