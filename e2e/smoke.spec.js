import { test, expect } from "@playwright/test";

test("home page loads with the sign-in form", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Meet people in your field");
  await expect(page.getByLabel("Your email")).toBeVisible();
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeEnabled();
});

test("sign-in form rejects an empty email without sending anything", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  const valid = await page.getByLabel("Your email").evaluate((el) => el.checkValidity());
  expect(valid).toBe(false);
});

test("signed-out visitors are sent away from private pages", async ({ page }) => {
  for (const path of ["/profile", "/matches", "/discover", "/around", "/contacts", "/messages", "/invite", "/story", "/admin/broadcast", "/admin/insights"]) {
    await page.goto(path);
    await expect(page).not.toHaveURL(new RegExp(path + "$"));
  }
});

test("admin CSV export is locked to the admin", async ({ request }) => {
  for (const type of ["members", "signups", "matches"]) {
    const r = await request.get("/admin/export?type=" + type);
    expect(r.status()).toBe(403);
  }
});

test("privacy and terms pages load", async ({ page }) => {
  for (const path of ["/privacy", "/terms"]) {
    const r = await page.goto(path);
    expect(r.status()).toBe(200);
  }
});

test("no page errors on the home page", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(errors).toEqual([]);
});

test("city landing page and sitemap load", async ({ page, request }) => {
  await page.goto("/city/jerusalem");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Jerusalem");
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
});

test("check-email page offers a six-digit code form", async ({ page }) => {
  await page.goto("/check-email");
  await expect(page.getByLabel("6-digit code")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
});

test("unknown invitation and badge pages return 404", async ({ request }) => {
  expect((await request.get("/s/zzzz9999")).status()).toBe(404);
  expect((await request.get("/b/zzzz9999")).status()).toBe(404);
});

test("a signed-out visitor to a deep link is asked to sign in and keeps the destination", async ({ page }) => {
  await page.goto("/coffee/abc123");
  await expect(page).toHaveURL(/next=%2Fcoffee%2Fabc123/);
  await expect(page.getByText("Sign in to continue")).toBeVisible();
});
