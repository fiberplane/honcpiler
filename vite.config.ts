import { cloudflare } from "@cloudflare/vite-plugin";
import { type Plugin, defineConfig } from "vite";

// https://github.com/brettimus/ts-vfs-test/blob/main/vite.config.ts#L28C1-L42C2
const polyfillTypescriptPackage = (): Plugin => {
  return {
    name: "fix-typescript-filename",
    transform(code, id) {
      // Only transform the typescript package
      // HACK - This is the only way I could find to get the correct filename for the typescript package
      if (id.includes("node_modules") && id.includes("typescript.js")) {
        // Replace __filename with a string that won't break in Cloudflare Workers
        // Replace Node.js specific variables with appropriate defaults
        return code
          .replace(/__filename/g, '"/virtual-typescript-path"')
          .replace(/process\.argv/g, "[]");
      }
    },
  };
};

// Plugin to handle .d.ts files as raw text
const rawTypeDeclarations = (): Plugin => {
  return {
    name: "raw-type-declarations",
    // Enforce raw loading for all .d.ts files
    transform(code, id) {
      if (id.endsWith(".d.ts")) {
        return `export default ${JSON.stringify(code)};`;
      }
    },
  };
};

export default defineConfig({
  plugins: [polyfillTypescriptPackage(), rawTypeDeclarations(), cloudflare()],
  // Explicitly tell Vite to treat .d.ts files as assets rather than source code
  assetsInclude: ["**/*.d.ts"],
});
