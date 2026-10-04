import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  // Run in UTC like Vercel, so tests cannot pass by accident on a machine set to Rome time.
  test: { include: ["lib/**/*.test.ts", "components/**/*.test.ts"], env: { TZ: "UTC" } },
});
