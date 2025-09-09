import type { InputFiles } from "../src/typescript-compile";

const code = `
import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";

type Bindings = { DB: D1Database };

type Variables = { db: any; };

const app = new Hono<{ Bindings: Bindings, Variables: Variables }>();

app.use(async (c, next) => {
  const db = drizzle(c.env.DB);
  c.set("db", db);
  await next();
});

export default app;
`;

const input = [
  {
    path: "/src/index.ts",
    content: code,
  },
];

compile(input)
  .then((a) => {
    console.log(JSON.stringify(a, null, 2));
  })
  .catch((e) => {
    console.log("error!!!");
    console.error(e);
  });

async function compile(body: InputFiles[]) {
  const response = await fetch("http://localhost:8437/compile?debug=true", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "X-Honcpiler-Auth": "meow",
    },
  });

  return response.json();
}
