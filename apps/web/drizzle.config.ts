import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./src/lib/db",
  schema: "./src/lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DRIZZLE_DATABASE_URL!,
  },
});
