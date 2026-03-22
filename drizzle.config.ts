import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Supabase provides a pooled connection string — use the "Transaction" mode URL
    url: process.env.DATABASE_URL!,
  },
});
