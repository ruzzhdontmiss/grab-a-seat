import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Drizzle Kit runs outside Next.js, so load the local env file ourselves.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is missing. Copy .env.example to .env.local and add your Neon connection string.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
});
