export type RevisionDifference = Readonly<{
  after: string | null;
  before: string | null;
  kind: "added" | "changed" | "removed";
  path: string;
}>;

export function compareRevisionSnapshots(
  current: unknown,
  draft: unknown,
): readonly RevisionDifference[] {
  const currentValues = flattenSnapshot(current);
  const draftValues = flattenSnapshot(draft);
  const paths = [...new Set([...currentValues.keys(), ...draftValues.keys()])]
    .filter((path) => currentValues.get(path) !== draftValues.get(path))
    .sort();

  return paths.map((path) => {
    const before = currentValues.get(path) ?? null;
    const after = draftValues.get(path) ?? null;
    return {
      after,
      before,
      kind: before === null ? "added" : after === null ? "removed" : "changed",
      path,
    };
  });
}

function flattenSnapshot(value: unknown): ReadonlyMap<string, string> {
  const entries = new Map<string, string>();
  visit(value, "", entries);
  return entries;
}

function visit(value: unknown, path: string, entries: Map<string, string>) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => visit(item, `${path}[${index}]`, entries));
    return;
  }
  if (isRecord(value)) {
    Object.keys(value)
      .sort()
      .forEach((key) =>
        visit(value[key], path ? `${path}.${key}` : key, entries),
      );
    return;
  }
  if (path) entries.set(path, renderValue(value));
}

function renderValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
