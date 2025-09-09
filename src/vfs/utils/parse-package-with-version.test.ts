import { describe, expect, it } from "vitest";
import { parsePackageWithVersion } from "./parse-package-with-version";

describe("parsePackageWithVersion", () => {
  describe("regular packages", () => {
    it("should parse package with version", () => {
      const result = parsePackageWithVersion("lodash@4.17.21");
      expect(result).toEqual({ name: "lodash", version: "4.17.21" });
    });

    it("should parse package with semver range", () => {
      const result = parsePackageWithVersion("react@^18.0.0");
      expect(result).toEqual({ name: "react", version: "^18.0.0" });
    });

    it("should parse package with beta version", () => {
      const result = parsePackageWithVersion("next@14.0.0-beta.1");
      expect(result).toEqual({ name: "next", version: "14.0.0-beta.1" });
    });

    it("should handle package without version", () => {
      const result = parsePackageWithVersion("lodash");
      expect(result).toEqual({ name: "lodash", version: "latest" });
    });

    it("should handle package with multiple @ symbols in version", () => {
      const result = parsePackageWithVersion("package@1.0.0@alpha");
      expect(result).toEqual({ name: "package", version: "1.0.0@alpha" });
    });
  });

  describe("scoped packages", () => {
    it("should parse scoped package with version", () => {
      const result = parsePackageWithVersion("@types/node@18.0.0");
      expect(result).toEqual({ name: "@types/node", version: "18.0.0" });
    });

    it("should parse scoped package with complex version", () => {
      const result = parsePackageWithVersion("@babel/core@^7.20.0");
      expect(result).toEqual({ name: "@babel/core", version: "^7.20.0" });
    });

    it("should parse scoped package with beta version", () => {
      const result = parsePackageWithVersion(
        "@next/bundle-analyzer@14.0.0-beta.1",
      );
      expect(result).toEqual({
        name: "@next/bundle-analyzer",
        version: "14.0.0-beta.1",
      });
    });

    it("should handle scoped package without version", () => {
      const result = parsePackageWithVersion("@types/node");
      expect(result).toEqual({ name: "@types/node", version: "latest" });
    });

    it("should handle invalid scoped package format", () => {
      const result = parsePackageWithVersion("@invalid-scope");
      expect(result).toEqual({ name: "@invalid-scope", version: "latest" });
    });

    it("should handle scoped package with multiple @ in version", () => {
      const result = parsePackageWithVersion("@types/node@18.0.0@alpha");
      expect(result).toEqual({ name: "@types/node", version: "18.0.0@alpha" });
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const result = parsePackageWithVersion("");
      expect(result).toEqual({ name: "", version: "latest" });
    });

    it("should handle string with only @", () => {
      const result = parsePackageWithVersion("@");
      expect(result).toEqual({ name: "@", version: "latest" });
    });

    it("should handle package name ending with @", () => {
      const result = parsePackageWithVersion("package@");
      expect(result).toEqual({ name: "package", version: "" });
    });

    it("should handle scoped package ending with @", () => {
      const result = parsePackageWithVersion("@scope/package@");
      expect(result).toEqual({ name: "@scope/package", version: "" });
    });
  });

  describe("real-world examples", () => {
    it("should handle Cloudflare Workers types", () => {
      const result = parsePackageWithVersion(
        "@cloudflare/workers-types@4.20250321.0",
      );
      expect(result).toEqual({
        name: "@cloudflare/workers-types",
        version: "4.20250321.0",
      });
    });

    it("should handle TypeScript", () => {
      const result = parsePackageWithVersion("typescript@5.7.3");
      expect(result).toEqual({ name: "typescript", version: "5.7.3" });
    });

    it("should handle Hono", () => {
      const result = parsePackageWithVersion("hono@4.7.10");
      expect(result).toEqual({ name: "hono", version: "4.7.10" });
    });

    it("should handle Zod", () => {
      const result = parsePackageWithVersion("zod@3.23.8");
      expect(result).toEqual({ name: "zod", version: "3.23.8" });
    });
  });
});
