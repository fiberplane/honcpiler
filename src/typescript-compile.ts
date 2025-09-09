import * as typescriptVfs from "@typescript/vfs";
import typescript from "typescript";
import { parsePackageJson } from "./parse-packages";
import { createFsMap } from "./vfs";

export type InputFiles = {
  path: string;
  content: string;
};

export type ErrorInfo = {
  message: string;
  severity: "error" | "warning";
  location?: string;
};

/**
 * Compiles a list of TypeScript input files and outputs whether any errors occurred.
 *
 * @param input List of files to compile. The files' `path` NEEDS to start with a `/`
 * @param kv KV Namespace where dependencies are stored
 * @param ctx Execution Context of CF workers
 * @param debug Whether to debug log in the console
 */
export async function compileTypescript(
  input: InputFiles[],
  kv: KVNamespace,
  ctx: ExecutionContext,
  debug = false,
): Promise<ErrorInfo[]> {
  const dependencies = parsePackageJson(input);

  const fsMap = await createFsMap(kv, ctx, dependencies, debug);

  // Add a leading slash to the file path if there is none
  // This is necessary to work with the typescript vfs
  //
  // INVESTIGATE: Can we change the basepath config
  //   in the tsconfig.json we pass to the compiler to resolve this?
  const virtualizedFiles = input.map((file) => ({
    ...file,
    path: file.path?.startsWith("/") ? file.path : `/${file.path}`,
  }));

  for (const file of virtualizedFiles) {
    if (!file.path.startsWith("/")) {
      console.warn(
        `[compileTypescript] file path does not start with "/" - ${file.path}`,
      );
    }

    fsMap.set(file.path, file.content);
  }

  const compilerOptions = {
    target: typescript.ScriptTarget.ESNext,
    module: typescript.ModuleKind.ESNext,
    moduleResolution: typescript.ModuleResolutionKind.Bundler,
    lib: ["ESNext"],
    strict: true,
    types: ["@cloudflare/workers-types"],
    skipLibCheck: true,
    noEmit: true,
    // For debugging: Enable module resolution tracing
    // This is useful to see how TypeScript resolves modules,
    // in case you can't figure out why it's not picking up type definitions for a dependency
    traceResolution: debug,
  };

  if (debug) {
    console.log(
      "[honcpiler] [debug] Compiler options:",
      JSON.stringify(compilerOptions, null, 2),
    );
    console.log(
      "[honcpiler] [debug] Virtual filesystem has",
      fsMap.size,
      "files",
    );

    // Log files in the virtual filesystem that might be relevant to Hono
    console.log("[debug] Files in virtual filesystem related to Hono:");
    const honoFiles = [...fsMap.keys()].filter((path) => path.includes("hono"));
    for (const file of honoFiles) {
      console.log(`   - ${file}`);
    }
  }

  const system = typescriptVfs.createSystem(fsMap);

  // Override fileExists to trace file lookup
  const origFileExists = system.fileExists;
  system.fileExists = (path: string): boolean => {
    const a = origFileExists.call(system, path);
    if (debug && !a && path.endsWith(".d.ts")) {
      console.error(`[honcpiler] failed to look for ${path}`);
    }

    return a;
  };

  // Override readFile to trace file reading
  const origReadFile = system.readFile;
  system.readFile = (path: string): string | undefined => {
    // NOTE - Helpful to put debug logs here
    return origReadFile.call(system, path);
  };

  const host = typescriptVfs.createVirtualCompilerHost(
    system,
    compilerOptions,
    typescript,
  );

  // Create a custom module resolution host to trace resolutions
  if (debug && host.compilerHost.resolveModuleNames) {
    const origResolveModuleNames = host.compilerHost.resolveModuleNames;
    host.compilerHost.resolveModuleNames = function (
      moduleNames,
      containingFile,
      ...rest
    ) {
      console.log(
        `[honcpiler] [debug] Resolving modules from ${containingFile}:`,
        moduleNames,
      );
      const result = origResolveModuleNames.apply(this, [
        moduleNames,
        containingFile,
        ...rest,
      ]);
      console.log("[honcpiler] [debug] Resolution result:", result);
      return result;
    };
  }

  const program = typescript.createProgram({
    rootNames: [...fsMap.keys()].filter((name) => name.endsWith(".ts")),
    options: compilerOptions,
    host: host.compilerHost,
  });

  const emitResult = program.emit();
  const allDiagnostics = typescript
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  const errors: ErrorInfo[] = [];

  // biome-ignore lint/complexity/noForEach: processing diagnostics
  allDiagnostics.forEach((diagnostic) => {
    const message = typescript.flattenDiagnosticMessageText(
      diagnostic.messageText,
      "\n",
    );
    const severity =
      diagnostic.category === typescript.DiagnosticCategory.Error
        ? "error"
        : "warning";
    const code = diagnostic.code;

    const errorInfo: ErrorInfo = {
      message: `TS${code}: ${message}`,
      severity,
    };

    if (diagnostic.file && diagnostic.start !== undefined) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start,
      );
      errorInfo.location = `${diagnostic.file.fileName}:${line + 1}:${character + 1}`;
    }

    errors.push(errorInfo);
  });

  if (debug) {
    console.log(`Found ${errors.length} diagnostic messages`);
  }

  return errors;
}
