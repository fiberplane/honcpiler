import type { InputFiles } from "./typescript-compile";

export type PackageDependency = {
  name: string;
  version: string;
};

export type ParsedDependencies = {
  dependencies: PackageDependency[];
  devDependencies: PackageDependency[];
};

/**
 * Parses package.json from InputFiles array and extracts all dependencies and devDependencies
 * @param input Array of input files
 * @returns Object containing parsed dependencies and devDependencies
 */
export function parsePackageJson(input: InputFiles[]): ParsedDependencies {
  // Find package.json file in the input array
  const packageJsonFile = input.find(
    (file) =>
      file.path === "package.json" ||
      file.path === "/package.json" ||
      file.path.endsWith("/package.json"),
  );

  if (!packageJsonFile) {
    throw new Error("no package.json found in input files");
  }

  try {
    const packageJson = JSON.parse(packageJsonFile.content);

    const dependencies: PackageDependency[] = [];
    const devDependencies: PackageDependency[] = [];

    // Parse dependencies
    if (
      packageJson.dependencies &&
      typeof packageJson.dependencies === "object"
    ) {
      for (const [name, version] of Object.entries(packageJson.dependencies)) {
        if (typeof version === "string") {
          dependencies.push({ name, version });
        }
      }
    }

    // Parse devDependencies
    if (
      packageJson.devDependencies &&
      typeof packageJson.devDependencies === "object"
    ) {
      for (const [name, version] of Object.entries(
        packageJson.devDependencies,
      )) {
        if (typeof version === "string") {
          devDependencies.push({ name, version });
        }
      }
    }

    return {
      dependencies,
      devDependencies,
    };
  } catch (error) {
    console.error("[parsePackageJson] Failed to parse package.json:", error);
    throw error;
  }
}
