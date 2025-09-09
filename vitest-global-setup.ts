import childProcess from "node:child_process";

/**
 * Global setup that runs inside Node.js, not `workerd`
 *
 * We need to build the honcpiler before running the tests, and point to its bundled javascript file.
 * Woof.
 * Look in the vitest.config.ts for more details.
 *
 * Inspired by:
 * - https://github.com/cloudflare/workers-sdk/blob/85bd27ade6b8458fb1e4096cbf8c2245022bab36/fixtures/vitest-pool-workers-examples/multiple-workers/global-setup.ts
 *
 * For more vitest recipes for Cloudflare Workers setups:
 * - https://developers.cloudflare.com/workers/testing/vitest-integration/recipes/
 */
export default function () {
  const label = "Built honcpiler with vite";
  console.time(label);
  childProcess.execSync("vite build");
  console.timeEnd(label);
}
