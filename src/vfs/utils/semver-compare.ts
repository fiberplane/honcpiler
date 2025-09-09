/**
 * Returns the latest (highest) version from a list of semver version strings
 * @param versions Array of semver version strings
 * @returns The latest version string, or undefined if the array is empty
 */
export function getLatestVersion(versions: string[]): string | undefined {
  if (versions.length === 0) {
    return undefined;
  }

  return versions.reduce((latest, current) => {
    return compareVersions(current, latest) > 0 ? current : latest;
  }, versions[0]);
}

/**
 * Compares two semver version strings
 * @param {string} version1 - First version to compare
 * @param {string} version2 - Second version to compare
 * @returns {number} 1 if version1 is greater, -1 if version1 is less, 0 if equal
 */
export function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split(".").map((part) => {
    // Extract any prerelease or build metadata
    const match = part.match(/^(\d+)(.*)$/);
    return match ? Number.parseInt(match[1], 10) : 0;
  });

  const v2Parts = version2.split(".").map((part) => {
    const match = part.match(/^(\d+)(.*)$/);
    return match ? Number.parseInt(match[1], 10) : 0;
  });

  // Compare major, minor, patch
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;

    if (v1Part > v2Part) {
      return 1;
    }
    if (v1Part < v2Part) {
      return -1;
    }
  }

  // Handle prerelease tags (prerelease versions are lower than release versions)
  const v1Prerelease = version1.includes("-");
  const v2Prerelease = version2.includes("-");

  if (!v1Prerelease && v2Prerelease) {
    return 1;
  }
  if (v1Prerelease && !v2Prerelease) {
    return -1;
  }

  return 0;
}
