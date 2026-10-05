import { defineConfig } from "@playwright/test";
import { E2E_PASSWORD, E2E_PORT, E2E_SESSION_SECRET } from "./e2e/constants";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  // The specs share one database and some log study entries, so run them one at a time.
  workers: 1,
  use: { baseURL: `http://localhost:${E2E_PORT}` },
  webServer: {
    command: `npx next dev -p ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}/login`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      APP_PASSWORD: E2E_PASSWORD,
      SESSION_SECRET: E2E_SESSION_SECRET,
    },
  },
});
