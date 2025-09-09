#!/usr/bin/env tsx

import * as child_process from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { extractPackagesFromPackageJson } from "@fiberplane/honcsolver";
import * as dotenv from "dotenv";
import pacote from "pacote";

dotenv.config();

// Helper function to parse wrangler.toml and find KV namespace ID
function findKVNamespaceIdFromWranglerToml(): string | undefined {
  try {
    // Try to find wrangler.toml in the current directory or parent directories
    let currentDir = process.cwd();
    let wranglerPath = "";

    while (currentDir !== path.parse(currentDir).root) {
      const possiblePath = path.join(currentDir, "wrangler.toml");
      if (fs.existsSync(possiblePath)) {
        wranglerPath = possiblePath;
        break;
      }
      currentDir = path.dirname(currentDir);
    }

    if (!wranglerPath) {
      console.warn("Warning: wrangler.toml not found");
      return undefined;
    }

    console.log(`Found wrangler.toml at: ${wranglerPath}`);
    const wranglerContent = fs.readFileSync(wranglerPath, "utf-8");

    // Basic TOML parsing to find KV namespace ID
    // Looking for patterns like:
    // [[kv_namespaces]]
    // binding = "..."
    // id = "abcdef123456"

    const kvMatch = wranglerContent.match(
      /\[\[kv_namespaces\]\][^\[]*id\s*=\s*["']([^"']+)["']/,
    );
    if (kvMatch?.[1]) {
      console.log(`Found KV namespace ID in wrangler.toml: ${kvMatch[1]}`);
      return kvMatch[1];
    }

    console.warn("Warning: No KV namespace ID found in wrangler.toml");
    return undefined;
  } catch (error) {
    console.warn("Error parsing wrangler.toml:", error);
    return undefined;
  }
}

// Check for required environment variables for Cloudflare Workers KV
let CLOUDFLARE_NAMESPACE_ID = process.env.CLOUDFLARE_NAMESPACE_ID;

// If not provided via environment variable, try to find it in wrangler.toml
if (!CLOUDFLARE_NAMESPACE_ID) {
  console.log(
    "CLOUDFLARE_NAMESPACE_ID environment variable not set, attempting to find it in wrangler.toml...",
  );
  CLOUDFLARE_NAMESPACE_ID = findKVNamespaceIdFromWranglerToml();

  if (!CLOUDFLARE_NAMESPACE_ID) {
    console.error(
      "Error: Could not find CLOUDFLARE_NAMESPACE_ID in environment variables or wrangler.toml",
    );
    console.error(
      "Please either set CLOUDFLARE_NAMESPACE_ID environment variable or ensure your wrangler.toml has a KV namespace defined",
    );
    console.error(
      "Example: CLOUDFLARE_NAMESPACE_ID=namespaceId tsx dependencies-uploader.ts path/to/package.json",
    );
    process.exit(1);
  }
}

// Parse CLI arguments
const args = process.argv.slice(2);
const useLocalKV = args.includes("--local");
const skipDevDependencies = args.includes("--skip-dev");
const inputArg = args.filter((arg) => !arg.startsWith("--"))[0];

if (!inputArg) {
  console.error("Please provide a path to package.json.");
  console.error(
    "Usage: tsx dependencies-uploader.ts <path-to-package.json> [--local] [--skip-dev]",
  );
  process.exit(1);
}

if (!inputArg.endsWith("package.json") || !fs.existsSync(inputArg)) {
  console.error(
    "Error: The input must be a valid path to a package.json file.",
  );
  console.error(
    "Usage: tsx dependencies-uploader.ts <path-to-package.json> [--local] [--skip-dev]",
  );
  process.exit(1);
}

// Create a temporary directory
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "npm-package-"));

// Function to recursively find all files
function findAllFiles(dir: string): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const list = fs.readdirSync(dir);

  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...findAllFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }

  return results;
}

// Function to remove empty directories
function removeEmptyDirs(dir: string): boolean {
  if (!fs.existsSync(dir)) {
    return false;
  }

  let isEmpty = true;
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Recursively check and remove empty subdirectories
      const subdirIsEmpty = removeEmptyDirs(fullPath);
      // If subdirectory is not empty, then current directory is not empty
      if (!subdirIsEmpty) {
        isEmpty = false;
      }
    } else {
      // If there's a file, the directory is not empty
      isEmpty = false;
    }
  }

  // If directory is empty, remove it
  if (isEmpty) {
    fs.rmdirSync(dir);
    return true;
  }

  return false;
}

async function uploadToKV(
  packageName: string,
  definitions: Record<string, string>,
  useLocal: boolean,
): Promise<void> {
  console.log(
    `Uploading ${packageName} declarations to ${useLocal ? "local" : "remote"} Cloudflare Workers KV...`,
  );
  const kvValue = JSON.stringify(definitions);

  // Write the value to a temporary file
  const tempFilePath = path.join(
    os.tmpdir(),
    `${packageName.replace("/", "-")}-kv-value.json`,
  );
  fs.writeFileSync(tempFilePath, kvValue);

  // Base command for wrangler
  let command = `wrangler kv key put "${packageName}" --path="${tempFilePath}" --namespace-id=${CLOUDFLARE_NAMESPACE_ID}`;

  // Add --local flag if using local KV
  if (useLocal) {
    command += " --local";
  } else {
    command += " --remote";
  }

  try {
    console.log(`Executing: ${command}`);
    child_process.execSync(command, { stdio: "inherit" });
    fs.unlinkSync(tempFilePath);
    console.log(
      `Successfully uploaded ${packageName} declarations to ${useLocal ? "local" : "remote"} KV`,
    );
  } catch (error) {
    console.error(
      `Error uploading to ${useLocal ? "local" : "remote"} KV:`,
      error,
    );
    throw error;
  }
}

function extractDefinitions(definitionPaths: string[], packageJsonDir: string) {
  const definitionsContent: Record<string, string> = {};

  for (const dtsPath of definitionPaths) {
    try {
      const fullPath = path.join(packageJsonDir, dtsPath.substring(2)); // Remove "./" prefix
      definitionsContent[dtsPath.substring(1)] = fs.readFileSync(
        fullPath,
        "utf-8",
      ); // Remove leading dot
    } catch (error) {
      console.warn(`Warning: Could not read file ${dtsPath}: ${error}`);
    }
  }
  return definitionsContent;
}

// Function to process a single package using pacote
async function processPackage(
  packageName: string,
  packageVersion: string,
): Promise<void> {
  try {
    console.log(`Processing ${packageName}@${packageVersion}...`);

    // Create a unique directory for this package
    const packageTempDir = path.join(
      tempDir,
      `${packageName.replace("/", "-")}-${packageVersion}`,
    );
    fs.mkdirSync(packageTempDir, { recursive: true });

    // Extract the package directly using pacote
    const extractDir = path.join(packageTempDir, "extracted");
    fs.mkdirSync(extractDir, { recursive: true });

    console.log(
      `Extracting ${packageName}@${packageVersion} to ${extractDir}...`,
    );
    const spec = `${packageName}@${packageVersion}`;
    await pacote.extract(spec, extractDir, {
      cache: path.join(os.tmpdir(), "pacote-cache"),
    });

    // Find the package directory
    const packageDir = extractDir;

    // Find all files
    const allFiles = findAllFiles(packageDir);

    // Find the top-level package.json
    let topLevelPackageJson = path.join(packageDir, "package.json");

    if (!fs.existsSync(topLevelPackageJson)) {
      // If not found, find the package.json with the shortest path (most likely to be the top level one)
      const packageJsonFiles = allFiles.filter(
        (file) => path.basename(file) === "package.json",
      );
      if (packageJsonFiles.length > 0) {
        // Sort by path length to find the shallowest one
        packageJsonFiles.sort((a, b) => a.length - b.length);
        topLevelPackageJson = packageJsonFiles[0];
      } else {
        throw new Error("No package.json found in the extracted package");
      }
    }

    // Keep only top-level package.json and *.d.ts files
    const filesToKeep = allFiles.filter((file) => {
      if (file.endsWith(".d.ts")) {
        return true;
      }
      if (path.basename(file) === "package.json") {
        // Only keep the file if it's the top-level package.json
        return file === topLevelPackageJson;
      }
      return false;
    });

    // Delete all other files
    for (const file of allFiles) {
      if (!filesToKeep.includes(file)) {
        fs.unlinkSync(file);
      }
    }

    // Clean up empty directories
    removeEmptyDirs(packageDir);

    // Re-scan for remaining files after cleanup
    const remainingFiles = findAllFiles(packageDir);

    // Find the package.json file to use as the reference point
    const packageJsonPath = remainingFiles.find(
      (file) => path.basename(file) === "package.json",
    );

    if (!packageJsonPath) {
      throw new Error("package.json not found in the extracted package");
    }

    // Use the directory containing package.json as the base for relative paths
    const packageJsonDir = path.dirname(packageJsonPath);

    // Create the output JSON structure
    const definitionPaths = remainingFiles
      .filter(
        (file) =>
          file.endsWith(".d.ts") || path.basename(file) === "package.json",
      )
      .map((file) => {
        // Get the relative path from the package.json directory and add './' prefix
        let relativePath = path.relative(packageJsonDir, file);
        // Convert Windows backslashes to forward slashes if needed
        relativePath = relativePath.replace(/\\/g, "/");
        return `./${relativePath}`;
      });

    const output = {
      definitions: definitionPaths,
    };

    // Write the types.json file next to package.json
    const typesJsonPath = path.join(packageJsonDir, "types.json");
    fs.writeFileSync(typesJsonPath, JSON.stringify(output, null, 2));

    console.log(
      `\nSuccessfully processed package ${packageName}@${packageVersion}`,
    );
    console.log(`Types information written to: ${typesJsonPath}`);

    // Read the definition files and prepare for upload
    console.log("Reading definition files for upload...");

    // Build the result object for Cloudflare KV
    const definitionsContent = extractDefinitions(
      definitionPaths,
      packageJsonDir,
    );

    console.log(
      `Read ${Object.keys(definitionsContent).length} of ${definitionPaths.length} definition files`,
    );

    // Upload to Cloudflare KV
    await uploadToKV(
      `${packageName}@${packageVersion}`,
      definitionsContent,
      useLocalKV,
    );

    console.log(
      `Successfully processed and uploaded ${packageName}@${packageVersion}`,
    );
  } catch (error) {
    console.error(`Error processing ${packageName}:`, error);
    // Continue with other packages instead of exiting
  }
}

// Function to process a package.json file
async function processPackageJson(packageJsonPath: string): Promise<void> {
  console.log(`Processing package.json from: ${packageJsonPath}`);

  try {
    // Read and parse the package.json file
    const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");
    const { dependencies, devDependencies } =
      extractPackagesFromPackageJson(packageJsonContent);

    console.log(
      `Found ${dependencies.length} dependencies and ${devDependencies.length} devDependencies`,
    );

    // Process regular dependencies
    console.log("Processing dependencies...");
    for (const dep of dependencies) {
      console.log(
        `\n--- Processing dependency: ${dep.name}@${dep.version} ---`,
      );
      await processPackage(dep.name, dep.version);
    }

    // Process dev dependencies if not skipped
    if (!skipDevDependencies && devDependencies.length > 0) {
      console.log("\nProcessing devDependencies...");
      for (const dep of devDependencies) {
        console.log(
          `\n--- Processing devDependency: ${dep.name}@${dep.version} ---`,
        );
        await processPackage(dep.name, dep.version);
      }
    }

    console.log("\nCompleted processing all dependencies from package.json");
  } catch (error) {
    console.error("Error processing package.json:", error);
    process.exit(1);
  }
}

// Main function
async function main() {
  try {
    await processPackageJson(inputArg);
    console.log("Process completed successfully!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    // Cleanup temp directory
    console.log(`Cleaning up temporary directory: ${tempDir}`);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (err) {
      console.warn("Warning: Could not clean up temporary directory:", err);
    }
  }
}

main();
