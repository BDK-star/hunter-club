export function resolveRequestId(candidate: string | null): string {
  if (candidate && /^[A-Za-z0-9._:-]{8,128}$/.test(candidate)) {
    return candidate;
  }

  return crypto.randomUUID();
}
