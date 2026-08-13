import { describe, expect, it } from "vitest";

import { resolveLocalReturnPath } from "./local-return-path";

describe("resolve local return path", () => {
  it("keeps an internal path, query and fragment", () => {
    expect(resolveLocalReturnPath("/library/gon?q=小杰#facts")).toBe(
      "/library/gon?q=%E5%B0%8F%E6%9D%B0#facts",
    );
  });

  it.each([
    "https://evil.example/",
    "//evil.example/",
    "/\\evil.example/",
    "/%5cevil.example/",
    "/%2fevil.example/",
    "/editorial%0d%0aLocation:https://evil.example/",
  ])("rejects a non-local return target: %s", (candidate) => {
    expect(resolveLocalReturnPath(candidate)).toBe("/saloon");
  });

  it("uses the caller fallback for missing or non-string values", () => {
    expect(resolveLocalReturnPath(null, "/auth")).toBe("/auth");
    expect(resolveLocalReturnPath({ candidate: "/editorial" }, "/auth")).toBe(
      "/auth",
    );
  });
});
