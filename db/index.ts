import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Use a module-level singleton so Next.js hot-reload doesn't leak connections
const globalForDb = globalThis as unknown as { _pg?: ReturnType<typeof postgres> };

const client =
  globalForDb._pg ??
  postgres(process.env.DATABASE_URL!, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb._pg = client;

export const db = drizzle(client, { schema });
