/** @type {import('dependency-cruiser').IConfiguration} */
const dependencyCruiserConfiguration = {
  forbidden: [
    {
      name: "no-circular-dependencies",
      severity: "error",
      from: { path: "^src" },
      to: { circular: true },
    },
    {
      name: "domain-does-not-depend-on-frameworks-or-infrastructure",
      severity: "error",
      from: { path: "^src/modules/[^/]+/domain" },
      to: {
        path: "^(?:next|react|drizzle-orm|postgres|@supabase|src/platform)",
      },
    },
    {
      name: "modules-use-other-module-public-entrypoints",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/" },
      to: {
        path: "^src/modules/(?!$1/)[^/]+/(?!public[.]ts$).+",
      },
    },
    {
      name: "business-modules-do-not-depend-on-platform-adapters",
      severity: "error",
      from: { path: "^src/modules/" },
      to: { path: "^src/platform/" },
    },
    {
      name: "presentation-does-not-bypass-application-services",
      severity: "error",
      from: {
        path: "^src/(?:app|modules/[^/]+/presentation)/",
      },
      to: {
        path: "^src/(?:platform/database|modules/[^/]+/infrastructure)/",
      },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    enhancedResolveOptions: {
      conditionNames: ["import", "types", "default"],
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    },
    exclude: "(?:^|/)(?:node_modules|[.]next)(?:/|$)",
    tsConfig: { fileName: "tsconfig.json" },
  },
};

export default dependencyCruiserConfiguration;
