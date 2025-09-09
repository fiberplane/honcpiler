import * as untar from "@andrewbranch/untar.js";
import { gunzipSync } from "fflate";

// biome-ignore lint/suspicious/noExplicitAny: im not gonna include whole npm response struct for now
type Any = any;

/**
 * Resolves the "latest" version to an actual version number for an npm package
 */
async function resolveLatestVersion(packageName: string): Promise<string> {
  const npmRegistry = "https://registry.npmjs.org";
  const response = await fetch(`${npmRegistry}/${packageName}`);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch package info for ${packageName}: ${response.statusText}`,
    );
  }

  const data = await response.json<Any>();
  return data["dist-tags"].latest;
}

/**
 * grabs a dependency from npm and returns it in the usual KV format.
 * will also in the background upload it into the KV for future use but that is not blocking
 */
export async function grabDependency(
  name: string,
  version = "latest",
  debug = false,
): Promise<ArrayBuffer> {
  const packageId = `${name}@${version}`;
  if (debug) {
    console.log(`[grabDependency] Grabbing dependency: ${packageId}`);
  }

  // Resolve version if "latest"
  const resolvedVersion =
    version === "latest" ? await resolveLatestVersion(name) : version;
  if (debug && version === "latest") {
    console.log(
      `[grabDependency] Resolved "latest" to version ${resolvedVersion}`,
    );
  }

  // Build the npm registry URL
  const npmRegistry = "https://registry.npmjs.org";
  // For scoped packages like @org/package, the tarball filename is just package-version.tgz
  const tarballName = name.startsWith("@") ? name.split("/")[1] : name;
  const packageUrl = `${npmRegistry}/${name}/-/${tarballName}-${resolvedVersion}.tgz`;

  if (debug) {
    console.log(`[grabDependency] Downloading package from: ${packageUrl}`);
  }

  // Fetch the package tarball
  const response = await fetch(packageUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch package ${packageId}: ${response.statusText}`,
    );
  }

  // Return the package content as an ArrayBuffer
  const arrayBuffer = await response.arrayBuffer();

  if (debug) {
    console.log(`[grabDependency] Successfully downloaded ${packageId}`);
  }

  return arrayBuffer;
}

/**
 * Extracts an npm package tarball in memory without writing to the file system
 * Returns a Record with filenames as keys and their content as Uint8Array values
 */
export async function extractPackageTarball(
  tarball: ArrayBuffer,
  debug = false,
): Promise<Record<string, Uint8Array>> {
  if (debug) {
    console.log("[extractPackageTarball] Extracting package tarball in memory");
  }

  // Convert ArrayBuffer to Uint8Array for fflate
  const tarballData = new Uint8Array(tarball);

  // Use synchronous gunzipSync instead of async gunzip to avoid Worker issues
  let decompressedData: Uint8Array;
  try {
    decompressedData = gunzipSync(tarballData);
  } catch (err) {
    throw new Error(
      `Failed to decompress gzip data: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (debug) {
    console.log("[extractPackageTarball] Successfully decompressed gzip layer");
  }

  // Use @andrewbranch/untar.js to extract the tar archive
  const files: Record<string, Uint8Array> = {};

  try {
    // Use untar.untar() with the decompressed data - convert Uint8Array to ArrayBuffer
    const arrayBuffer = decompressedData.buffer.slice(
      decompressedData.byteOffset,
      decompressedData.byteOffset + decompressedData.byteLength,
    );
    const extractedFiles = untar.untar(<ArrayBuffer>arrayBuffer);

    for (const file of extractedFiles) {
      if (debug) {
        console.log(`[extractPackageTarball] processing ${file.filename}`);
      }

      // Skip directories - check if file has content
      if (!file.fileData || file.fileData.length === 0) {
        continue;
      }

      // Remove the 'package/' prefix that npm tarballs typically have
      const normalizedPath = file.filename.replace(/^package\//, "");

      if (normalizedPath) {
        files[normalizedPath] = new Uint8Array(file.fileData);
      }
    }
  } catch (err) {
    throw new Error(
      `Failed to extract tar archive: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (debug) {
    console.log(
      `[extractPackageTarball] Extracted ${Object.keys(files).length} files from tarball`,
    );
  }

  return files;
}

/**
 * Extracts only TypeScript declaration files (.d.ts) and the top-level package.json from an npm package
 * Returns a Record with filenames as keys and their content as strings
 */
export async function extractTypeDefinitions(
  tarball: ArrayBuffer,
  debug = false,
): Promise<Record<string, string>> {
  if (debug) {
    console.log(
      "[extractTypeDefinitions] Extracting TypeScript definitions and package.json",
    );
  }

  // Get all files first
  const allFiles = await extractPackageTarball(tarball, debug);

  // Filter for .d.ts files and top-level package.json only
  const typeFiles: Record<string, string> = {};
  const decoder = new TextDecoder("utf-8");

  // Process each file
  for (const [path, content] of Object.entries(allFiles)) {
    // Check if it's a .d.ts file or the top-level package.json
    const isDtsFile = path.endsWith(".d.ts");
    const isTopLevelPackageJson = path === "package.json"; // TODO: check if this is right

    if (!isDtsFile && !isTopLevelPackageJson) {
      continue;
    }

    try {
      // Decode as text
      const textContent = decoder.decode(content);
      const normalizedPath = `/${path}`;

      typeFiles[normalizedPath] = textContent;

      if (debug) {
        if (isDtsFile) {
          console.log(
            `[extractTypeDefinitions] Found TypeScript definition: ${path}`,
          );
        }
        if (isTopLevelPackageJson) {
          console.log("[extractTypeDefinitions] Found package.json");
        }
      }
    } catch (error) {
      if (debug) {
        console.log(`[extractTypeDefinitions] Failed to decode file: ${path}`);
      }
    }
  }

  if (debug) {
    console.log(
      `[extractTypeDefinitions] Extracted ${Object.keys(typeFiles).length} files:`,
    );
    console.log(
      `[extractTypeDefinitions] - ${Object.keys(typeFiles).filter((p) => p.endsWith(".d.ts")).length} TypeScript definitions`,
    );
    console.log(
      `[extractTypeDefinitions] - ${Object.keys(typeFiles).filter((p) => p === "package.json").length} package.json`,
    );
  }

  return typeFiles;
}

/**
 * Stores TypeScript definitions and package.json in KV storage
 * Uses "packageName@version" as the key and stores an object with file paths as keys
 */
export async function storeTypeDefinitionsInKV(
  kv: KVNamespace,
  ctx: ExecutionContext,
  packageName: string,
  version: string,
  typeDefinitions: Record<string, string>,
  debug = false,
): Promise<Record<string, string>> {
  const packageId = `${packageName}@${version}`;
  if (debug) {
    console.log(
      `[storeTypeDefinitionsInKV] Storing type definitions for ${packageId} in KV`,
    );
  }

  try {
    // Convert to the expected format for KV storage
    const kvValue = JSON.stringify(typeDefinitions);

    // Store in KV
    const promise = new Promise((resolve, reject) => {
      try {
        kv.put(packageId, kvValue).then(resolve, reject);

        if (debug) {
          console.log(
            `[storeTypeDefinitionsInKV] Successfully stored ${Object.keys(typeDefinitions).length} files for ${packageId} in KV`,
          );
          console.log(
            `[storeTypeDefinitionsInKV] - ${Object.keys(typeDefinitions).filter((p) => p.endsWith(".d.ts")).length} TypeScript definitions`,
          );
          console.log(
            `[storeTypeDefinitionsInKV] - ${Object.keys(typeDefinitions).filter((p) => p === "package.json").length} package.json`,
          );
        }
      } catch (err) {
        reject(err);
      }
    });

    if (isRunningInVitest()) {
      await promise;
    } else {
      ctx.waitUntil(promise);
    }

    return typeDefinitions;
  } catch (error) {
    throw new Error(
      `Failed to store type definitions for ${packageId} in KV: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Convenience function that downloads, extracts, and stores TypeScript definitions for a package
 * Returns the extracted type definitions
 */
export async function downloadAndStoreTypeDefinitions(
  kv: KVNamespace,
  ctx: ExecutionContext,
  packageName: string,
  version = "latest",
  debug = false,
): Promise<Record<string, string>> {
  if (debug) {
    console.log(
      `[downloadAndStoreTypeDefinitions] No cached definitions found for ${packageName}@${version}, downloading...`,
    );
  }

  // Resolve the "latest" version if needed
  const resolvedVersion =
    version === "latest" ? await resolveLatestVersion(packageName) : version;

  // Download and extract
  // TODO - use @mjackson/tar-parser to do a streaming extraction
  const tarball = await grabDependency(packageName, resolvedVersion, debug);
  const typeDefinitions = await extractTypeDefinitions(tarball, debug);

  // Store in KV and return it for usage with honcpiler
  return await storeTypeDefinitionsInKV(
    kv,
    ctx,
    packageName,
    resolvedVersion,
    typeDefinitions,
    debug,
  );
}

function isRunningInVitest(): boolean {
  // Check environment variables
  if (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true" ||
    typeof process.env.VITEST_WORKER_ID !== "undefined"
  ) {
    return true;
  }

  // Check for Vitest globals using 'in' operator
  if ("vi" in globalThis || "__vitest_worker__" in globalThis) {
    return true;
  }

  return false;
}
