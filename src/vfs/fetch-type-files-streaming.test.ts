import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchTypeDefinitionsStreaming,
  fetchTypeDefinitionsStreamingAsync,
} from "./fetch-type-files-streaming";

// Mock the tar-parser
vi.mock("@mjackson/tar-parser", () => ({
  parseTar: vi.fn(),
}));

describe("fetch-type-files-streaming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    global.fetch = vi.fn();
  });

  describe("fetchTypeDefinitionsStreaming", () => {
    it("should fetch and extract .d.ts files and package.json from a mock tarball", async () => {
      // Mock the npm registry response for version resolution
      const mockRegistryResponse = {
        "dist-tags": {
          latest: "1.0.0",
        },
      };

      // Mock the tarball fetch response
      const mockTarballResponse = {
        ok: true,
        body: {
          pipeThrough: vi.fn().mockReturnValue("mock-decompressed-stream"),
        },
      };

      // Set up fetch mock to return different responses based on URL
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("registry.npmjs.org") && !url.includes(".tgz")) {
          // Registry lookup
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockRegistryResponse),
          });
        }
        // Tarball download
        return Promise.resolve(mockTarballResponse);
      });

      // Mock the parseTar function to simulate tar entries
      const { parseTar } = await import("@mjackson/tar-parser");
      const mockParseTar = parseTar as ReturnType<typeof vi.fn>;

      mockParseTar.mockImplementation(async (_stream, callback) => {
        // Simulate tar entries with mock data
        const mockEntries = [
          {
            name: "package/package.json",
            type: "file",
            size: 100,
            body: {
              getReader: () => ({
                read: () => {
                  const packageJsonContent = JSON.stringify({
                    name: "test-package",
                    version: "1.0.0",
                    types: "index.d.ts",
                  });
                  const encoder = new TextEncoder();
                  return {
                    done: false,
                    value: encoder.encode(packageJsonContent),
                  };
                },
              }),
            },
          },
          {
            name: "package/index.d.ts",
            type: "file",
            size: 50,
            body: {
              getReader: () => ({
                read: () => {
                  const dtsContent = "export declare function test(): void;";
                  const encoder = new TextEncoder();
                  return {
                    done: false,
                    value: encoder.encode(dtsContent),
                  };
                },
              }),
            },
          },
          {
            name: "package/lib/nested.d.ts",
            type: "file",
            size: 60,
            body: {
              getReader: () => ({
                read: () => {
                  const dtsContent = "export interface NestedInterface {}";
                  const encoder = new TextEncoder();
                  return {
                    done: false,
                    value: encoder.encode(dtsContent),
                  };
                },
              }),
            },
          },
          {
            name: "package/src/source.ts",
            type: "file",
            size: 40,
            body: {
              getReader: () => ({
                read: () => {
                  const encoder = new TextEncoder();
                  return {
                    done: false,
                    value: encoder.encode("// source file"),
                  };
                },
              }),
            },
          },
          {
            name: "package/README.md",
            type: "file",
            size: 30,
            body: {
              getReader: () => ({
                read: () => {
                  const encoder = new TextEncoder();
                  return {
                    done: false,
                    value: encoder.encode("# Test Package"),
                  };
                },
              }),
            },
          },
        ];

        // Call the callback for each entry
        for (const entry of mockEntries) {
          callback(entry);
        }
      });

      const result = await fetchTypeDefinitionsStreaming(
        "test-package",
        "latest",
        true,
      );

      // Verify the correct files were extracted
      expect(Object.keys(result)).toHaveLength(3); // package.json + 2 .d.ts files
      expect(result).toHaveProperty("/package.json");
      expect(result).toHaveProperty("/index.d.ts");
      expect(result).toHaveProperty("/lib/nested.d.ts");

      // Verify .ts and .md files were filtered out
      expect(result).not.toHaveProperty("/src/source.ts");
      expect(result).not.toHaveProperty("/README.md");

      // Verify fetch was called correctly
      expect(fetch).toHaveBeenCalledWith(
        "https://registry.npmjs.org/test-package",
      );
      expect(fetch).toHaveBeenCalledWith(
        "https://registry.npmjs.org/test-package/-/test-package-1.0.0.tgz",
      );

      // Verify parseTar was called with the decompressed stream
      expect(parseTar).toHaveBeenCalledWith(
        "mock-decompressed-stream",
        expect.any(Function),
      );
    });

    it("should handle packages with explicit version", async () => {
      const mockTarballResponse = {
        ok: true,
        body: {
          pipeThrough: vi.fn().mockReturnValue("mock-decompressed-stream"),
        },
      };

      global.fetch = vi.fn().mockResolvedValue(mockTarballResponse);

      const { parseTar } = await import("@mjackson/tar-parser");
      const mockParseTar = parseTar as ReturnType<typeof vi.fn>;

      mockParseTar.mockImplementation(async (_stream, _callback) => {
        // Just return empty to test the fetch URL
      });

      await fetchTypeDefinitionsStreaming("test-package", "2.1.0");

      // Should not call registry for version resolution
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        "https://registry.npmjs.org/test-package/-/test-package-2.1.0.tgz",
      );
    });

    it("should throw error on failed package fetch", async () => {
      // Mock registry response to succeed first
      const mockRegistryResponse = {
        "dist-tags": {
          latest: "1.0.0",
        },
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("registry.npmjs.org") && !url.includes(".tgz")) {
          // Registry lookup succeeds
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockRegistryResponse),
          });
        }
        // Tarball download fails
        return Promise.resolve({
          ok: false,
          statusText: "Not Found",
        });
      });

      await expect(
        fetchTypeDefinitionsStreaming("nonexistent-package"),
      ).rejects.toThrow(
        "Failed to fetch package nonexistent-package@1.0.0: Not Found",
      );
    });

    it("should throw error when response has no body", async () => {
      // Mock registry response to succeed first
      const mockRegistryResponse = {
        "dist-tags": {
          latest: "1.0.0",
        },
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("registry.npmjs.org") && !url.includes(".tgz")) {
          // Registry lookup succeeds
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockRegistryResponse),
          });
        }

        // Tarball download has no body
        return Promise.resolve({
          ok: true,
          body: null,
        });
      });

      await expect(
        fetchTypeDefinitionsStreaming("test-package"),
      ).rejects.toThrow("No response body for package test-package@1.0.0");
    });
  });

  describe("fetchTypeDefinitionsStreamingAsync", () => {
    it("should properly handle async entry reading", async () => {
      // Mock the npm registry response for version resolution
      const mockRegistryResponse = {
        "dist-tags": {
          latest: "1.0.0",
        },
      };

      // Mock the tarball fetch response
      const mockTarballResponse = {
        ok: true,
        body: {
          pipeThrough: vi.fn().mockReturnValue("mock-decompressed-stream"),
        },
      };

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("registry.npmjs.org") && !url.includes(".tgz")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockRegistryResponse),
          });
        }

        return Promise.resolve(mockTarballResponse);
      });

      const { parseTar } = await import("@mjackson/tar-parser");
      const mockParseTar = parseTar as ReturnType<typeof vi.fn>;

      mockParseTar.mockImplementation(async (_stream, callback) => {
        const mockEntry = {
          name: "package/index.d.ts",
          type: "file",
          size: 50,
          body: {
            getReader: () => {
              let called = false;
              return {
                read: async () => {
                  if (!called) {
                    called = true;
                    const dtsContent = "export declare function test(): void;";
                    const encoder = new TextEncoder();
                    return {
                      done: false,
                      value: encoder.encode(dtsContent),
                    };
                  }

                  return { done: true, value: undefined };
                },
              };
            },
          },
        };

        callback(mockEntry);
      });

      const result = await fetchTypeDefinitionsStreamingAsync(
        "test-package",
        "latest",
      );

      expect(Object.keys(result)).toHaveLength(1);
      expect(result).toHaveProperty("/index.d.ts");
      expect(result["/index.d.ts"]).toBe(
        "export declare function test(): void;",
      );
    });

    it("should handle multiple chunks in entry body", async () => {
      const mockTarballResponse = {
        ok: true,
        body: {
          pipeThrough: vi.fn().mockReturnValue("mock-decompressed-stream"),
        },
      };

      global.fetch = vi.fn().mockResolvedValue(mockTarballResponse);

      const { parseTar } = await import("@mjackson/tar-parser");
      const mockParseTar = parseTar as ReturnType<typeof vi.fn>;

      mockParseTar.mockImplementation(async (_stream, callback) => {
        const mockEntry = {
          name: "package/large.d.ts",
          type: "file",
          size: 100,
          body: {
            getReader: () => {
              let chunkCount = 0;
              return {
                read: async () => {
                  const encoder = new TextEncoder();

                  if (chunkCount === 0) {
                    chunkCount++;
                    return {
                      done: false,
                      value: encoder.encode("export declare "),
                    };
                  }
                  if (chunkCount === 1) {
                    chunkCount++;
                    return {
                      done: false,
                      value: encoder.encode("function test(): void;"),
                    };
                  }
                  return { done: true, value: undefined };
                },
              };
            },
          },
        };

        callback(mockEntry);
      });

      const result = await fetchTypeDefinitionsStreamingAsync(
        "test-package",
        "1.0.0",
      );

      expect(Object.keys(result)).toHaveLength(1);
      expect(result).toHaveProperty("/large.d.ts");
      expect(result["/large.d.ts"]).toBe(
        "export declare function test(): void;",
      );
    });
  });

  describe("common functionality", () => {
    it("should filter out directories", async () => {
      const mockTarballResponse = {
        ok: true,
        body: {
          pipeThrough: vi.fn().mockReturnValue("mock-decompressed-stream"),
        },
      };

      global.fetch = vi.fn().mockResolvedValue(mockTarballResponse);

      const { parseTar } = await import("@mjackson/tar-parser");
      const mockParseTar = parseTar as ReturnType<typeof vi.fn>;

      mockParseTar.mockImplementation(async (_stream, callback) => {
        const mockEntries = [
          {
            name: "package/types/",
            type: "directory",
            size: 0,
            body: null,
          },
          {
            name: "package/types/index.d.ts",
            type: "file",
            size: 50,
            body: {
              getReader: () => ({
                read: () => {
                  const encoder = new TextEncoder();
                  return {
                    done: false,
                    value: encoder.encode("export interface Test {}"),
                  };
                },
              }),
            },
          },
        ];

        for (const entry of mockEntries) {
          callback(entry);
        }
      });

      const result = await fetchTypeDefinitionsStreaming(
        "test-package",
        "1.0.0",
      );

      expect(Object.keys(result)).toHaveLength(1);
      expect(result).toHaveProperty("/types/index.d.ts");
      expect(result).not.toHaveProperty("/types/");
    });

    it("should normalize package paths correctly", async () => {
      const mockTarballResponse = {
        ok: true,
        body: {
          pipeThrough: vi.fn().mockReturnValue("mock-decompressed-stream"),
        },
      };

      global.fetch = vi.fn().mockResolvedValue(mockTarballResponse);

      const { parseTar } = await import("@mjackson/tar-parser");
      const mockParseTar = parseTar as ReturnType<typeof vi.fn>;

      mockParseTar.mockImplementation(async (_stream, callback) => {
        const mockEntry = {
          name: "package/deep/nested/path/types.d.ts",
          type: "file",
          size: 50,
          body: {
            getReader: () => ({
              read: () => {
                const encoder = new TextEncoder();
                return {
                  done: false,
                  value: encoder.encode("export type Deep = string;"),
                };
              },
            }),
          },
        };

        callback(mockEntry);
      });

      const result = await fetchTypeDefinitionsStreaming(
        "test-package",
        "1.0.0",
      );

      expect(Object.keys(result)).toHaveLength(1);
      expect(result).toHaveProperty("/deep/nested/path/types.d.ts");
      expect(result["/deep/nested/path/types.d.ts"]).toBe(
        "export type Deep = string;",
      );
    });
  });
});
