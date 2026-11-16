import { defineConfig, devices } from "@playwright/test";
// Runs against the live site by default. To test locally: set BASE_URL=http://localhost:3000 and run `npm run dev` first.
export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 1,
  reporter: [["list"]],
  use: { baseURL: process.env.BASE_URL || "https://kave-seven.vercel.app", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "phone", use: { ...devices["Pixel 7"] } }, { name: "desktop", use: { ...devices["Desktop Chrome"] } }],
});
