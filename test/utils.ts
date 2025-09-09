import type { InputFiles } from "../src/typescript-compile";

export function contentInMainBasic(content: string): InputFiles[] {
  return [
    {
      path: "/index.ts",
      content,
    },
    {
      path: "/package.json",
      content: JSON.stringify({
        dependencies: {},
        devDependencies: {
          "@cloudflare/workers-types": "4.20250722.0",
        },
      }),
    },
  ];
}

export function contentInMainHonc(content: string): InputFiles[] {
  return [
    {
      path: "/index.ts",
      content,
    },
    {
      path: "/package.json",
      content: JSON.stringify({
        dependencies: {
          "@cloudflare/workers-types": "4.20250722.0",
          hono: "4.7.10",
          "drizzle-orm": "0.43.1",
          "@fiberplane/hono": "0.5.2",
        },
      }),
    },
  ];
}
