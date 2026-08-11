import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const cssPath = resolve(repositoryRoot, "src/app/globals.css");
const socialCardPath = resolve(repositoryRoot, "public/og.png");
const assetRegisterPath = resolve(repositoryRoot, "ASSET_LICENSES.md");
const criticalScenePaths = [
  resolve(repositoryRoot, "src/app/page.tsx"),
  resolve(repositoryRoot, "src/app/saloon/page.tsx"),
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Experience contract failed: ${message}`);
}

const css = await readFile(cssPath, "utf8");
const cssBytes = Buffer.byteLength(css);
assert(
  cssBytes <= 64 * 1024,
  `global CSS is ${cssBytes} bytes; budget is 64 KiB`,
);
assert(
  css.includes("prefers-reduced-motion: reduce"),
  "reduced-motion fallback is missing",
);
assert(
  css.includes("@media (max-width: 56rem)"),
  "mobile scene breakpoint is missing",
);

for (const scenePath of criticalScenePaths) {
  const source = await readFile(scenePath, "utf8");
  assert(
    !source.includes("next/image"),
    `${scenePath} imports a critical scene image`,
  );
  assert(
    !source.includes("<img"),
    `${scenePath} embeds a critical scene image`,
  );
}

const socialCard = await readFile(socialCardPath);
const socialCardBytes = (await stat(socialCardPath)).size;
assert(
  socialCardBytes <= 2.5 * 1024 * 1024,
  `social card is ${socialCardBytes} bytes; budget is 2.5 MiB`,
);
const socialCardHash = createHash("sha256")
  .update(socialCard)
  .digest("hex")
  .toUpperCase();
const assetRegister = await readFile(assetRegisterPath, "utf8");
assert(
  assetRegister.includes(socialCardHash),
  "social card hash is not registered",
);

console.log(
  `Experience contract passed: CSS ${cssBytes} bytes, social card ${socialCardBytes} bytes, critical scenes are CSS-only.`,
);
