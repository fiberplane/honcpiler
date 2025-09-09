import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    // This setup file will run `vite build` to produce the honcpiler app,
    // We do this to circumvent issues with nodejs compatibility mode and the typescript dependency.
    globalSetup: ["./vitest-global-setup.ts"],

    poolOptions: {
      workers: {
        singleWorker: true,
        // NOTE - If tests start getting super slow, we could turn off isolated storage like so:
        // isolatedStorage: false,
        miniflare: {
          // Configuration for the test runner Worker
          compatibilityDate: "2025-02-04",
          compatibilityFlags: ["nodejs_compat"],
          serviceBindings: {
            HONCPILER: "honcpiler",
          },

          kvNamespaces: {
            KV: {
              id: "b1e708b8b87a48159929cc0f48f2ef81",
            },
          },

          d1Databases: {
            COMPILE_DB: "honc-compile-results",
          },

          workers: [
            // Configuration for the "auxiliary" Worker under test.
            // Unfortunately, auxiliary Workers cannot load their configuration
            // from `wrangler.toml` files, and must be configured with Miniflare
            // `WorkerOptions`.
            {
              name: "honcpiler",
              modules: true,
              scriptPath: "./dist/honcpiler/index.js", // Built by `global-setup.ts`
              compatibilityDate: "2025-02-04",
              compatibilityFlags: ["nodejs_compat"],
              kvNamespaces: {
                KV: {
                  id: "b1e708b8b87a48159929cc0f48f2ef81",
                },
              },
              d1Databases: {
                COMPILE_DB: "honc-compile-results",
              },
            },
          ],
        },
      },
    },
  },
});
