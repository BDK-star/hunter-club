import "server-only";

import type { Sql, TransactionSql } from "postgres";

import type {
  PublicationCommit,
  PublicationState,
  PublicationStore,
} from "../application/execute-publication";
import {
  commitPublicationTransaction,
  loadPublicationState,
  PublicationConflictError,
} from "./publication-transaction";

export { PublicationConflictError };

export class PostgresPublicationStore implements PublicationStore {
  constructor(
    private readonly sql: Sql,
    private readonly afterPublication?: (
      transaction: TransactionSql,
    ) => Promise<void>,
  ) {}

  async loadState(revisionId: string): Promise<PublicationState | null> {
    return this.sql.begin((transaction) =>
      loadPublicationState(transaction, revisionId),
    );
  }

  async commit(command: PublicationCommit): Promise<void> {
    await this.sql.begin((transaction) =>
      commitPublicationTransaction(
        transaction,
        command,
        this.afterPublication
          ? { afterPublication: this.afterPublication }
          : {},
      ),
    );
  }
}
