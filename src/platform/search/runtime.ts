import "server-only";

import type { SearchService } from "@/modules/search/public";
import { PostgresSearchService } from "@/modules/search/infrastructure/postgres-search-service";
import { getServerEnvironment } from "@/platform/config/runtime";
import { getRuntimeSql } from "@/platform/database/runtime";

export function getRuntimeSearchService(): SearchService {
  return new PostgresSearchService(
    getRuntimeSql(),
    getServerEnvironment().searchMetricFingerprintKey,
  );
}
