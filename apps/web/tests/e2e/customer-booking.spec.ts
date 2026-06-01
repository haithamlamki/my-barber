import { test, expect } from "@playwright/test";
import { E2E_TENANT } from "./fixtures/tenant";

// Mirrors lib/booking/code.ts alphabet (8 chars, no 0/1/I/L/O/U ambiguity).
const BOOKING_CODE_RE = /[ABCDEFGHJKMNPQRSTVWXYZ23456789ab]{8}/;

// The two projects (chromium-ar, chromium-en) run in parallel and both create a
// real, committed appointment. Picking a distinct date per locale keeps them from
// racing the same slot. Within a date the widget only renders open times, so the
// "first available" pick naturally advances as earlier slots fill across runs.
function dateIndexFor(projectName: string): number {
  return projectName.includes("ar") ? 3 : 7;
}

test("guest completes the booking journey and sees a booking code", async ({ page }, testInfo) => {
  // The journey cold-compiles several routes and two server actions on first run;
  // triple the budget so a fresh dev/CI server doesn't time out mid-flow.
  test.slow();
  const locale = testInfo.project.name.includes("ar") ? "ar" : "en";
  const dir = locale === "ar" ? "rtl" : "ltr";

  // Step 1 — service. Target the isolated E2E service by URL so the cross-tenant
  // /book listing (which also shows the demo seed services) stays deterministic.
  await page.goto(`/${locale}/book`);
  await expect(page.locator("html")).toHaveAttribute("dir", dir);
  await page.locator(`a[href="/${locale}/book/${E2E_TENANT.service}"]`).click();
  await page.waitForURL(`**/${locale}/book/${E2E_TENANT.service}`);

  // Step 2 — barber (the E2E tenant has exactly one public barber at this location).
  await page.locator(`a[href="/${locale}/book/${E2E_TENANT.service}/${E2E_TENANT.staff}"]`).click();
  await page.waitForURL(`**/${locale}/book/${E2E_TENANT.service}/${E2E_TENANT.staff}`);

  // Step 3 — date. Before a date is chosen the only buttons are the date strip.
  await page.getByRole("button").nth(dateIndexFor(testInfo.project.name)).click();

  // Step 4 — slot. The slot grid renders only open times.
  const slot = page.locator("div.grid button").first();
  await expect(slot).toBeVisible({ timeout: 15_000 });
  await slot.click();

  // Step 5 — guest details + confirm.
  await page.fill('input[name="customer_name"]', "E2E Tester");
  await page.fill('input[name="customer_phone"]', "91234567");
  await page.locator('button[type="submit"]').click();

  // Confirmation — booking code is shown and the layout keeps its direction.
  await page.waitForURL(new RegExp(`/${locale}/book/confirmation/`), { timeout: 15_000 });
  await expect(page.locator("html")).toHaveAttribute("dir", dir);

  const code = page.url().split("/confirmation/")[1]?.replace(/\/$/, "") ?? "";
  expect(code).toMatch(BOOKING_CODE_RE);
  await expect(page.getByText(code)).toBeVisible();
});
