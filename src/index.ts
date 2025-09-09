import { WorkerEntrypoint } from "cloudflare:workers";
import {
  type ErrorInfo,
  type InputFiles,
  compileTypescript,
} from "./typescript-compile";

const HONCPILER_VERSION = "0.0.0";

interface Env {
  KV: KVNamespace;
  COMPILE_DB: D1Database;
}

export default class Honcpiler extends WorkerEntrypoint<Env> {
  // This is a fetch handle we can use for end-to-end testing of the service,
  // since our initial attempts to run the service in workerd via vitest-pool-workers did not pan out.
  //
  // Even if we get rid of this handler's logic, we still need to keep
  // a dummy `fetch` in order to allow deployments to workers despite using rpc and not fetch
  // > See: https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/rpc/
  //
  async fetch(request: Request) {
    if (
      request.method !== "POST" ||
      request.headers.get("X-Honcpiler-Auth") !== "meow"
    ) {
      return new Response("not found", {
        status: 404,
      });
    }

    const debugMode = parseDebugParam(request);

    const input = await request.json<InputFiles[]>();
    let errors: ErrorInfo[];

    try {
      errors = await compileTypescript(input, this.env.KV, this.ctx, debugMode);
    } catch (err) {
      console.error(`failed to compile typescript: ${err}`);
      return new Response("internal server error", {
        status: 500,
      });
    }

    return new Response(JSON.stringify(errors), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async compileTypeScript(
    files: InputFiles[],
    chatId: string,
    userId: string,
    debug = false,
  ): Promise<ErrorInfo[]> {
    if (debug) {
      console.log("[honcpiler] [compileTypeScript] compiling files:", files);
    }

    try {
      const result = await compileTypescript(
        files,
        this.env.KV,
        this.ctx,
        debug,
      );

      await uploadResultToD1(userId, chatId, result, this.env.COMPILE_DB);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          `failed to compile typescript: ${error.message}\n${error.stack}`,
        );
      } else {
        console.error(`failed to compile typescript: ${error}`);
      }
      // TODO: maybe store honcpiler fails in the d1 too?
      throw error;
    }
  }
}

async function uploadResultToD1(
  userId: string,
  projectId: string,
  errors: ErrorInfo[],
  d1: D1Database,
) {
  try {
    const timestamp = Date.now();
    const id = generateRandomString(16);

    await d1
      .prepare(`
          INSERT INTO compile_runs 
          (compile_id, timestamp, user_id, project_id, honc_version, error_count, errors_json, r2_prefix, legacy)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
      .bind(
        id,
        timestamp,
        userId ?? "unknown",
        projectId ?? "unknown",
        HONCPILER_VERSION,
        errors.length,
        JSON.stringify(errors),
        null, //r2_prefix?
        false,
      )
      .run();
  } catch (error) {
    console.error(`failed to upload honcpiler result to D1: ${error}`);
  }
}

/**
 * Parses the debug param from the request url.
 * If the param is not present, returns false.
 * If the param is present and === "true", returns true.
 * If there is an error parsing the param, logs the error and returns false.
 */
function parseDebugParam(request: Request) {
  let debug = false;
  try {
    const url = new URL(request.url);
    debug = url.searchParams.get("debug") === "true";
  } catch (err) {
    console.error(`failed to parse url debug param: ${err}`);
  }
  return debug;
}

function generateRandomString(length = 16): string {
  const array = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length);
}
