import { describe, expect, it } from "vitest";
import { compareVersions, getLatestVersion } from "./semver-compare";

describe("compareVersions", () => {
  it("compares major versions correctly", () => {
    expect(compareVersions("2.0.0", "1.0.0")).toBe(1);
    expect(compareVersions("1.0.0", "2.0.0")).toBe(-1);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
  });

  it("compares minor versions correctly", () => {
    expect(compareVersions("1.2.0", "1.1.0")).toBe(1);
    expect(compareVersions("1.1.0", "1.2.0")).toBe(-1);
    expect(compareVersions("1.1.0", "1.1.0")).toBe(0);
  });

  it("compares patch versions correctly", () => {
    expect(compareVersions("1.1.2", "1.1.1")).toBe(1);
    expect(compareVersions("1.1.1", "1.1.2")).toBe(-1);
    expect(compareVersions("1.1.1", "1.1.1")).toBe(0);
  });

  it("handles versions with different number of segments", () => {
    expect(compareVersions("1.1", "1.0.0")).toBe(1);
    expect(compareVersions("1.0", "1.0.1")).toBe(-1);
    expect(compareVersions("1", "1.0.0")).toBe(0);
  });

  it("treats prerelease versions as lower than regular versions", () => {
    expect(compareVersions("1.0.0", "1.0.0-beta")).toBe(1);
    expect(compareVersions("1.0.0-alpha", "1.0.0")).toBe(-1);
  });

  it("handles version parts with non-numeric suffixes", () => {
    expect(compareVersions("1.0.0beta", "1.0.0alpha")).toBe(0);
    expect(compareVersions("1.0.1alpha", "1.0.0beta")).toBe(1);
  });
});

describe("getLatestVersion", () => {
  it("returns undefined for empty array", () => {
    expect(getLatestVersion([])).toBeUndefined();
  });

  it("returns the only version in a single-item array", () => {
    expect(getLatestVersion(["1.0.0"])).toBe("1.0.0");
  });

  it("finds the highest version in an unsorted array", () => {
    expect(getLatestVersion(["1.0.0", "2.0.0", "1.5.0"])).toBe("2.0.0");
    expect(getLatestVersion(["0.9.0", "1.0.0-beta", "1.0.0"])).toBe("1.0.0");
  });

  it("handles complex version arrays", () => {
    const versions = ["2.1.0", "1.9.9", "2.0.0-beta", "2.0.0", "1.0.0"];
    expect(getLatestVersion(versions)).toBe("2.1.0");
  });

  it("works with irregular version strings", () => {
    expect(getLatestVersion(["1.0", "1.0.1", "1"])).toBe("1.0.1");
  });
});
