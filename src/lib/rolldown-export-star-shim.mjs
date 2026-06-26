import { readdirSync, existsSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";

/**
 * Find a package's real dist directory in the pnpm store by scanning
 * the pnpm .pnpm directory for the package's scoped entry.
 */
function findPkgDistDir(pkgName) {
  const scopeDir = join(process.cwd(), "node_modules", ".pnpm");
  const prefix = pkgName.replace(/\//g, "+");
  for (const entry of readdirSync(scopeDir)) {
    if (!entry.startsWith(prefix + "@")) continue;
    const candidate = join(scopeDir, entry, "node_modules", pkgName, "dist");
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(`Could not find dist directory for ${pkgName}`);
}

/**
 * Rolldown can't statically resolve named re-exports through `export *`
 * (e.g. `@solid-primitives/event-listener` and `@solid-primitives/props`).
 * This plugin intercepts bare imports of those packages and returns a
 * virtual module that re-exports from the dist subfiles by absolute path,
 * bypassing the `export *` indirection and the package `exports` map.
 */
export function solidPrimitivesExportStarShim() {
  const shims = {
    "@solid-primitives/event-listener": [
      "eventListener.js",
      "eventListenerMap.js",
      "components.js",
      "eventListenerStack.js",
      "callbackWrappers.js",
      "types.js",
    ],
    "@solid-primitives/props": ["propTraps.js", "filterProps.js", "combineProps.js"],
  };

  const resolved = {};
  for (const [pkg, files] of Object.entries(shims)) {
    const distDir = findPkgDistDir(pkg);
    resolved[pkg] = files.map((f) => resolvePath(distDir, f));
  }

  return {
    name: "solid-primitives-export-star-shim",
    enforce: "pre",
    resolveId(id) {
      return id in shims ? `__spshim__:${id}` : null;
    },
    load(id) {
      for (const [pkg, paths] of Object.entries(resolved)) {
        if (id === `__spshim__:${pkg}`) {
          return paths.map((p) => `export * from ${JSON.stringify(p)};`).join("\n");
        }
      }
      return null;
    },
  };
}
