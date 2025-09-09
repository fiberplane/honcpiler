/**
 * This file should contain tests to make sure the HONCPILER works with "typescript basics"
 * I.e., the code that's test-compiled in this file should not include external dependencies,
 * it should just test supported language features.
 */
import { env } from "cloudflare:test";
import { beforeEach, expect, test } from "vitest";
import { contentInMainBasic } from "./utils";

beforeEach(async () => {
  // Our default typescript compiler config includes the types `@cloudflare/workers-types`,
  // so we need those types even if we're not going to compile code that uses any special sauce from workerd.
  //
  // The following code creates some minimal test data for cloudflare type,
  // instead of loading the large JSON file from `kv-seed` into the KV.
  //
  // This is a minor perf optimization for this "core" set of tests.
  const minimalCloudflareTypes = {
    "/index.d.ts": `
      declare global {
        var console: Console;
      }
      export {};
    `,
    "/package.json": JSON.stringify({
      name: "@cloudflare/workers-types",
      version: "4.20250321.0",
      types: "index.d.ts",
    }),
  };

  await env.KV.put(
    "@cloudflare/workers-types@4.20250321.0",
    JSON.stringify(minimalCloudflareTypes),
  );
});

test("compiles hello world", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    contentInMainBasic(`
        console.log("hello world!");
    `),
    [],
  );

  expect(result).toStrictEqual([]);
});

test("fails to compile mismatched types", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    contentInMainBasic(`
        function meow(): string {
            const wow = [];

            for (let i = 0; i < 100; i++) {
                wow.push(i);
            }

            console.log("meow");
            return 0; // should error
        }

        meow();
    `),
    [],
  );

  expect(result).toStrictEqual([
    {
      location: "/index.ts:10:13",
      message: "TS2322: Type 'number' is not assignable to type 'string'.",
      severity: "error",
    },
  ]);
});

// New tests for modern built-in APIs ---------------------------

test("compiles array includes", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    contentInMainBasic(`
        const fruits = ["apple", "banana", "orange"];
        if (fruits.includes("banana")) {
          console.log("Found banana!");
        }
    `),
    "",
    "",
    false,
  );

  expect(result).toStrictEqual([]);
});

test("compiles string replaceAll", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    contentInMainBasic(`
        const greeting = "hello world";
        const updated = greeting.replaceAll("l", "x");
        console.log(updated);
    `),

    "",
    "",
    false,
  );

  expect(result).toStrictEqual([]);
});

test("compiles bigint literal", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    contentInMainBasic(`
        const bigNumber: bigint = 9007199254740991n;
        console.log(bigNumber);
    `),

    "",
    "",
    false,
  );

  expect(result).toStrictEqual([]);
});

// ES2018 features tests ---------------------------

test("compiles object spread syntax", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    contentInMainBasic(`
        const obj1 = { a: 1, b: 2 };
        const obj2 = { c: 3, d: 4 };
        const combined = { ...obj1, ...obj2 };
        console.log(combined);
    `),
    "",
    "",
    false,
  );

  expect(result).toStrictEqual([]);
});

test("compiles object rest properties", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    contentInMainBasic(`
        const obj = { a: 1, b: 2, c: 3 };
        const { a, ...rest } = obj;
        console.log(a, rest);
    `),
    "",
    "",
    false,
  );

  expect(result).toStrictEqual([]);
});

test("compiles async generator function", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    contentInMainBasic(`
        async function* asyncGenerator() {
          yield 1;
          yield 2;
          yield 3;
        }
        
        async function consumeAsyncGenerator() {
          for await (const value of asyncGenerator()) {
            console.log(value);
          }
        }
    `),
    [],
    "",
    "",
    false,
  );

  expect(result).toStrictEqual([]);
});

test("compiles Promise.finally", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    contentInMainBasic(`
        const promise = Promise.resolve(42);
        promise
          .then(value => console.log(value))
          .catch(error => console.error(error))
          .finally(() => console.log("Cleanup"));
    `),
    "",
    "",
    false,
  );

  expect(result).toStrictEqual([]);
});

test("compiles regex named capture groups", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    contentInMainBasic(`
        const regex = /(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})/;
        const match = regex.exec("2024-03-15");
        if (match && match.groups) {
          console.log(match.groups.year);
        }
    `),
    "",
    "",
    false,
  );

  expect(result).toStrictEqual([]);
});

test("compiles spread in function arguments with type checking", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    contentInMainBasic(`
        function sum(...numbers: number[]): number {
          return numbers.reduce((a, b) => a + b, 0);
        }
        
        const nums = [1, 2, 3];
        console.log(sum(...nums));
    `),
    "",
    "",
    false,
  );

  expect(result).toStrictEqual([]);
});

test("fails to compile object spread with wrong types", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    contentInMainBasic(`
        interface Person {
          name: string;
          age: number;
        }
        
        const person: Person = {
          name: "John",
          age: "thirty", // wrong type
        };
        
        const updatedPerson = { ...person, city: "NYC" };
    `),
    "",
    "",
    false,
  );

  expect(result).toHaveLength(1);
  expect(result[0].severity).toBe("error");
  expect(result[0].message).toContain(
    "Type 'string' is not assignable to type 'number'",
  );
});
