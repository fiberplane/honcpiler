export interface ParsedPackage {
  name: string;
  version: string;
}

export function parsePackageWithVersion(
  packageWithVersion: string,
): ParsedPackage {
  // Handle scoped packages like @types/node@18.0.0
  // The @ in the scope should not be confused with the version separator
  if (packageWithVersion.startsWith("@")) {
    const scopeEndIndex = packageWithVersion.indexOf("/");
    if (scopeEndIndex === -1) {
      // Invalid scoped package format
      return { name: packageWithVersion, version: "latest" };
    }

    const afterScope = packageWithVersion.substring(scopeEndIndex + 1);
    const versionAtIndex = afterScope.indexOf("@");

    if (versionAtIndex === -1) {
      return { name: packageWithVersion, version: "latest" };
    }

    const scope = packageWithVersion.substring(0, scopeEndIndex + 1);
    const nameAfterScope = afterScope.substring(0, versionAtIndex);
    const version = afterScope.substring(versionAtIndex + 1);

    return { name: scope + nameAfterScope, version };
  }

  // Handle regular packages like lodash@4.17.21
  const firstAtIndex = packageWithVersion.indexOf("@");
  if (firstAtIndex === -1) {
    return { name: packageWithVersion, version: "latest" };
  }

  const name = packageWithVersion.substring(0, firstAtIndex);
  const version = packageWithVersion.substring(firstAtIndex + 1);

  return { name, version };
}
