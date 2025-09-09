import { z } from "zod";
import { downloadAndStoreTypeDefinitions } from "./grab-dependency";
import { getLatestVersion } from "./utils/semver-compare";

export const KvJsonSchema = z.record(z.string(), z.string());

export async function addDependencyFromKv(
  fsMap: Map<string, string>,
  kv: KVNamespace,
  ctx: ExecutionContext,
  name: string,
  version = "latest",
  debug = false,
) {
  const start = performance.now();
  let resolvedVersion = version;

  if (version === "latest") {
    const result = await kv.list({
      prefix: name,
    });

    // Extract versions from keys and find the latest
    const versions = result.keys
      .map((key) => {
        // Assuming key format is like "@package@version"
        const fullPackageName = key.name.startsWith("@")
          ? key.name.substring(1)
          : key.name;
        return fullPackageName.split("@").slice(-1)[0];
      })
      .filter(Boolean);

    if (versions.length > 0) {
      resolvedVersion = getLatestVersion(versions) || version;
    }
  }

  const kvKey = `${name}@${resolvedVersion}`;
  const value = await kv.get(kvKey);
  let json: Record<string, string> | null;

  // if the dependency is not found, we need to download it from npm and upload it to the KV
  if (value === null) {
    console.log(
      `could not find dependency \`${kvKey}\` in KV, grabbing it from npm`,
    );

    json = await downloadAndStoreTypeDefinitions(
      kv,
      ctx,
      name,
      resolvedVersion,
      debug,
    ).catch((error) => {
      console.error(
        `[addDependencyFromKv] Error downloading and storing type definitions for ${kvKey}: ${error}`,
      );
      throw error;
    });

    console.log(`adding dependency \`${kvKey}\` to KV`);

    const result = KvJsonSchema.safeParse(json);
    if (result.success) {
      await kv.put(kvKey, JSON.stringify(json));
    } else {
      console.error(
        `[addDependencyFromKv] Error parsing JSON for ${kvKey}: ${result.error.format()}`,
      );
    }
  } else {
    // console.debug("found dependency in KV", kvKey);
    json = KvJsonSchema.parse(JSON.parse(value));
  }

  for (const [path, content] of Object.entries(json)) {
    fsMap.set(`/node_modules/${name}${path}`, content as string);
  }

  const end = performance.now();
  if (debug) {
    console.log(
      `[createFsMap] Fetched ${kvKey} from KV (${Object.keys(json).length} files) in ${end - start}ms`,
    );
  }
}
