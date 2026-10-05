import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Neon recommends a direct (non-pooled) connection for migrations; fall back to the app's URL.
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
