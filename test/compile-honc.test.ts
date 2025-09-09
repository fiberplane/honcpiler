/**
 * This file should contain tests to make sure the HONCPILER works with basic "honc" apps.
 */
import { env } from "cloudflare:test";
import { beforeEach, expect, test } from "vitest";
import { cloudflareTypes } from "./kv-seed/cloudflare-types";
import { drizzleOrmTypes } from "./kv-seed/drizzle-orm-types";
import { fiberplaneHonoTypes } from "./kv-seed/fiberplane-hono-types";
import { honoTypes } from "./kv-seed/hono-types";
import { contentInMainHonc } from "./utils";

beforeEach(async () => {
  await env.KV.put(
    "@cloudflare/workers-types@4.20250321.0",
    JSON.stringify(cloudflareTypes),
  );
  await env.KV.put("hono@4.7.10", JSON.stringify(honoTypes));

  await env.KV.put("drizzle-orm@0.43.1", JSON.stringify(drizzleOrmTypes));

  await env.KV.put(
    "@fiberplane/hono@0.5.2",
    JSON.stringify(fiberplaneHonoTypes),
  );
});

test("compiles hono", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    contentInMainHonc(`
        import { Hono } from "hono";

        const app = new Hono();
        app.get("/", (c) => c.text("meow"));
        
        export default app;
    `),
    "",
    "",
    true,
  );

  expect(result).toStrictEqual([]);
});

test("compiles cloudflare", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    contentInMainHonc(`
        import { Hono } from "hono";

        type Bindings = {
          MY_BUCKET: R2Bucket;
        };

        const app = new Hono<{ Bindings: Bindings }>();
        
        app.get("/", async (c) => {
          await c.env.MY_BUCKET.put("meow", "i need a treat");
          return c.text("meow");
        });
        
        export default app;
    `),
    "",
    "",
    true,
  );

  expect(result).toStrictEqual([]);
});

test("compiles drizzle", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    contentInMainHonc(`
        import { Hono } from "hono";
        import { drizzle } from 'drizzle-orm/d1';

        type Bindings = {
          DB: D1Database;
        };

        const app = new Hono<{ Bindings: Bindings }>();
        
        app.get("/", async (c) => {
          const db = drizzle(c.env.DB);
          return c.text("meow");
        });
        
        export default app;
    `),
    "",
    "",
    true,
  );

  expect(result).toStrictEqual([]);
});

test("compiles fiberplane", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    contentInMainHonc(`
        import { Hono } from "hono";
        import { createFiberplane, createOpenAPISpec } from "@fiberplane/hono";

        const app = new Hono();
        app.get("/", (c) => c.text("meow"));
        
        /**
         * Serve a simplified api specification for your API
         * As of writing, this is just the list of routes and their methods.
         */
        app.get("/openapi.json", (c) => {
          return c.json(
            createOpenAPISpec(app, {
              info: {
                title: "Honc D1 App",
                version: "1.0.0",
              },
            }),
          );
        });
        
        app.use(
          "/fp/*",
          createFiberplane({
            app,
            openapi: { url: "/openapi.json" },
          }),
        );
        
        export default app;
    `),
    "",
    "",
    true,
  );

  expect(result).toStrictEqual([]);
});

test("compiles third-party package (axios) not in KV", async () => {
  const result = await env.HONCPILER.compileTypeScript(
    [
      {
        path: "/src/index.ts",
        content: `
        import { Hono } from "hono";
        import axios from "axios";

        const app = new Hono();
        app.get("/", async (c) => {
          await axios.get("https://example.com");
          c.text("meow");
        });
        
        export default app;
    `,
      },
      {
        path: "/package.json",
        content: JSON.stringify({
          dependencies: {
            hono: "4.7.10",
            axios: "1.10.0",
          },
        }),
      },
    ],
    "",
    "",
    true,
  );

  expect(result).toStrictEqual([]);
});

test("compiles honc d1 template", async () => {
  const honcD1Template = [
    {
      path: "/src/index.ts",
      content: `
import { createFiberplane, createOpenAPISpec } from "@fiberplane/hono";
import { eq } from "drizzle-orm";
import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import * as schema from "./db/schema";

const initDb = createMiddleware<{
  Bindings: {
    DB: D1Database;
  };
  Variables: {
    db: DrizzleD1Database;
  };
}>(async (c, next) => {
  const db = drizzle(c.env.DB, {
    casing: "snake_case",
  });

  c.set("db", db);
  await next();
});

const api = new Hono()
  .use("*", initDb)
  .get("/users", async (c) => {
    const db = c.var.db;
    const users = await db.select().from(schema.users);

    return c.json(users);
  })
  .post("/users", async (c) => {
    const db = c.var.db;
    const { name, email } = await c.req.json();

    const [newUser] = await db
      .insert(schema.users)
      .values({
        name: name,
        email: email,
      })
      .returning();

    return c.json(newUser, 201);
  })
  .get("/users/:id", async (c) => {
    const db = c.var.db;
    const id = c.req.param("id");

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id));

    return c.json(user);
  });

const app = new Hono()
  .get("/", (c) => {
    return c.text("Honc from above! ☁️🪿");
  })
  .route("/api", api);

app.onError((error, c) => {
  console.error(error);
  if (error instanceof HTTPException) {
    return c.json(
      {
        message: error.message,
      },
      error.status,
    );
  }

  return c.json(
    {
      message: "Something went wrong",
    },
    500,
  );
});

/**
 * Serve a simplified api specification for your API
 * As of writing, this is just the list of routes and their methods.
 */
app.get("/openapi.json", (c) => {
  return c.json(
    createOpenAPISpec(app, {
      info: {
        title: "Honc D1 App",
        version: "1.0.0",
      },
    }),
  );
});


app.use(
  "/fp/*",
  createFiberplane({
    app,
    openapi: { url: "/openapi.json" },
  }),
);

export default app;`.trim(),
    },
    {
      path: "/src/db/schema.ts",
      content: `
import { type SQL, sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const currentTimestamp = () => {
  return sql\`(CURRENT_TIMESTAMP)\`;
};

const lower = (email: AnySQLiteColumn): SQL => {
  return sql\`lower(\${email})\`;
};

export type NewUser = typeof users.$inferInsert;

export const users = sqliteTable(
  "users",
  {
    // .primaryKey() must be chained before $defaultFn
    id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text().notNull(),
    email: text().notNull(),
    createdAt: text().notNull().default(currentTimestamp()),
    updatedAt: text().notNull().default(currentTimestamp()),
  },
  /**
   * Ensure case-insensitive uniqueness for email
   * @see https://orm.drizzle.team/docs/guides/unique-case-insensitive-email#sqlite
   */
  (table) => [uniqueIndex("emailUniqueIndex").on(lower(table.email))],
);`.trim(),
    },
    {
      path: "/package.json",
      content: JSON.stringify({
        dependencies: {
          "@cloudflare/workers-types": "4.20250321.0",
          hono: "4.7.10",
          "drizzle-orm": "0.43.1",
          "@fiberplane/hono": "0.5.2",
        },
      }),
    },
  ];

  const result = await env.HONCPILER.compileTypeScript(
    honcD1Template,
    "",
    "",
    true,
  );
  expect(result).toStrictEqual([]);
});
