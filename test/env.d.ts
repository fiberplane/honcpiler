import type { Honcpiler } from "../src";

declare module "cloudflare:test" {
   // Define the test environment interface
   interface TestEnv {
       KV: KVNamespace;
       HONCPILER: Honcpiler;
       COMPILE_DB: D1Database;
   }
   
   // ProvidedEnv controls the type of `import("cloudflare:test").env`
   interface ProvidedEnv extends TestEnv {}
   
   export const env: ProvidedEnv;
}
