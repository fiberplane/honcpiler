import { DEFAULT_CLOUDFLARE_TYPES_VERSION } from "../constants";
import type { ParsedDependencies } from "../parse-packages";
import { addDependencyFromKv } from "./add-dependency-from-kv";
import { addTypescriptLibs } from "./add-typescript-libs";

/**
 * Create a virtual fsMap with the typescript lib definitions and the additional dependencies from KV
 *
 * @param kv KV namespace where dependencies live
 * @param ctx Execution Context
 * @param parsedDependencies
 * @param debug Whether to output debug information
 *
 * @example
 * ```typescript
 * import { hackyParseDeps } from './hacky-parse-deps';
 * import { createFsMap } from './create-fs-map';
 *
 * // Parse dependencies from source files
 * const result = hackyParseDeps(sourceFiles, undefined, true);
 *
 * // Create fsMap with the found dependencies
 * const fsMap = await createFsMap(kv, result.withVersions, true);
 * ```
 */
export async function createFsMap(
  kv: KVNamespace,
  ctx: ExecutionContext,
  parsedDependencies: ParsedDependencies,
  debug = false,
) {
  const fsMap = new Map<string, string>();

  addTypescriptLibs(fsMap);

  const dependencies = [
    ...parsedDependencies.dependencies,
    ...parsedDependencies.devDependencies,
  ];

  // Always add @cloudflare/workers-types if not already included
  const CLOUDFLARE_TYPES_NAME = "@cloudflare/workers-types";
  const cloudflareTypesIndex = dependencies.findIndex(
    (dependency) => dependency.name === CLOUDFLARE_TYPES_NAME,
  );

  if (cloudflareTypesIndex === -1) {
    dependencies.push({
      name: CLOUDFLARE_TYPES_NAME,
      version: DEFAULT_CLOUDFLARE_TYPES_VERSION,
    });
  } else {
    dependencies[cloudflareTypesIndex].version =
      DEFAULT_CLOUDFLARE_TYPES_VERSION;
  }

  if (debug) {
    console.log("[createFsMap] Loading dependencies from KV:", dependencies);
  }

  // Build array of all dependencies to load and deduplicate by name@version
  const dependencyMap = new Map<string, { name: string; version: string }>();

  for (const dep of dependencies) {
    const { name, version } = dep;
    if (name && version) {
      const key = `${name}@${version}`;
      // Only add if we haven't seen this name@version combination before
      if (!dependencyMap.has(key)) {
        dependencyMap.set(key, { name, version });
      }
    }
  }

  const dependenciesToLoad = Array.from(dependencyMap.values());

  // Load all dependencies in parallel
  const results = await Promise.allSettled(
    dependenciesToLoad.map(({ name, version }) =>
      addDependencyFromKv(fsMap, kv, ctx, name, version, debug).catch(
        (error) => {
          if (debug) {
            console.warn(
              `[honcpiler] [createFsMap] Failed to load ${name}@${version}:`,
              error,
            );
          }
          // Re-throw to mark this promise as rejected
          throw error;
        },
      ),
    ),
  );

  if (debug) {
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    console.log(
      `[createFsMap] Loaded ${succeeded} dependencies successfully, ${failed} failed`,
    );
  }

  return fsMap;
}
