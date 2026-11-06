import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;

/**
 * E2E contra uma build de produção em MODO LOCAL (sem Supabase: dados no navegador).
 * Cada teste abre um contexto novo → dados de exemplo recriados.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e-report" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    acceptDownloads: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      // usa o Chrome do sistema se existir (CI: deixe vazio e rode `npx playwright install chromium`)
      executablePath: process.env.PW_CHROME || undefined,
      args: ["--no-proxy-server"],
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, grepInvert: /@mobile/ },
    { name: "mobile", use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } }, grep: /@mobile/ },
  ],
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_DIST_DIR: ".next-e2e",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      SUPABASE_SECRET_KEY: "",
    },
  },
});
