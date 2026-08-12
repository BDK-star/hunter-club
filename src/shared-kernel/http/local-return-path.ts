const defaultReturnPath = "/saloon";
const encodedPathSeparator = /%(?:2f|5c)/i;
const encodedControlCharacter = /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i;
const literalControlCharacter = /[\u0000-\u001f\u007f]/;

/** Resolve an untrusted login return target to an origin-relative URL. */
export function resolveLocalReturnPath(
  candidate: unknown,
  fallback = defaultReturnPath,
): string {
  if (
    typeof candidate !== "string" ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    encodedPathSeparator.test(candidate) ||
    encodedControlCharacter.test(candidate) ||
    literalControlCharacter.test(candidate)
  ) {
    return fallback;
  }

  try {
    const base = new URL("https://hunter-club.invalid");
    const resolved = new URL(candidate, base);
    if (resolved.origin !== base.origin) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
