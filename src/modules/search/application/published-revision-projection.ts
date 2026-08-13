import type { CatalogSpoilerLevel } from "@/modules/catalog/public";
import type { PublishedRevisionSnapshot } from "@/modules/publishing/public";

import {
  buildSearchProjectionDocument,
  type SearchProjectionDocument,
} from "./projection";

const spoilerRank: Readonly<Record<CatalogSpoilerLevel, number>> = {
  anime: 1,
  manga: 2,
  safe: 0,
};

export function projectPublishedRevision(
  input: Readonly<{
    publishedAt: Date;
    revisionId: string;
    slug: string;
    snapshot: PublishedRevisionSnapshot;
    targetId: string;
  }>,
): readonly SearchProjectionDocument[] {
  if (input.snapshot.type === "article") {
    return [
      buildSearchProjectionDocument({
        aliases: input.snapshot.aliases,
        body: input.snapshot.body,
        canonStatus: input.snapshot.canonStatus,
        kind: "article",
        locale: input.snapshot.locale,
        publishedAt: input.publishedAt,
        revisionId: input.revisionId,
        slug: input.slug,
        spoilerLevel: input.snapshot.spoilerLevel,
        targetId: input.targetId,
        targetKind: "article",
        title: input.snapshot.title,
      }),
    ];
  }

  const snapshot = input.snapshot;
  return snapshot.translations.flatMap((translation) =>
    spoilerBoundariesForFacts(snapshot.facts).map((spoilerLevel) => {
      const visibleFacts = snapshot.facts.filter(
        (fact) => spoilerRank[fact.spoilerLevel] <= spoilerRank[spoilerLevel],
      );
      const canonStatuses = new Set(
        visibleFacts.map(({ canonStatus }) => canonStatus),
      );
      return buildSearchProjectionDocument({
        aliases: translation.aliases,
        body: [
          translation.summary,
          ...visibleFacts.map(({ statement }) => statement),
        ]
          .filter(Boolean)
          .join("\n\n"),
        canonStatus:
          canonStatuses.size === 1 ? visibleFacts[0]!.canonStatus : "conflict",
        kind: snapshot.kind,
        locale: translation.locale,
        publishedAt: input.publishedAt,
        revisionId: input.revisionId,
        slug: input.slug,
        spoilerLevel,
        targetId: input.targetId,
        targetKind: "catalog_entity",
        title: translation.title,
      });
    }),
  );
}

function spoilerBoundariesForFacts(
  facts: readonly Readonly<{ spoilerLevel: CatalogSpoilerLevel }>[],
): readonly CatalogSpoilerLevel[] {
  if (facts.length === 0) return ["safe"];
  const levels = new Set(facts.map(({ spoilerLevel }) => spoilerLevel));
  return (["safe", "anime", "manga"] as const).filter((level) =>
    levels.has(level),
  );
}
