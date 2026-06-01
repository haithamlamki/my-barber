import { test, expect } from "@playwright/test";
import { clearMailbox, waitForOtp } from "./helpers/mail";

const OWNER_EMAIL = "owner@demo.local";

// One owner session exercises both directions: create a barber + assign a single
// service in the English (LTR) dashboard, then confirm the Arabic (RTL) dashboard
// renders the same barber. Auth is cookie-based, so one OTP login covers both.
test("owner adds a barber, assigns one service (en LTR), and sees it in Arabic (RTL)", async ({
  page,
}) => {
  test.setTimeout(60_000); // login OTP poll + barber provisioning span several requests
  await clearMailbox();

  await page.goto("/en/login");
  await page.getByRole("textbox").first().fill(OWNER_EMAIL);
  await page.getByRole("button", { name: "Send code" }).click();

  const codeInput = page.locator('input[autocomplete="one-time-code"]');
  await expect(codeInput).toBeVisible({ timeout: 15_000 });

  const code = await waitForOtp(OWNER_EMAIL, 20_000);
  await codeInput.fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL("**/en/dashboard/services", { timeout: 15_000 });

  // Go to the barbers page.
  await page.getByRole("link", { name: "Barbers" }).click();
  await page.waitForURL("**/en/dashboard/staff");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { name: "Barbers" })).toBeVisible();

  // Create a barber with a unique login email.
  const unique = `E2E Barber ${Date.now()}`;
  const email = `e2e.barber.${Date.now()}@demo.local`;
  await page.getByRole("link", { name: "Add barber" }).click();
  await page.waitForURL("**/en/dashboard/staff/new");
  await page.fill('input[name="display_name"]', unique);
  await page.fill('input[name="email"]', email);
  await page.fill('textarea[name="bio_en"]', "Test barber bio");
  await page.getByRole("button", { name: "Save barber" }).click();

  await page.waitForURL("**/en/dashboard/staff");
  const row = page.getByRole("row", { name: new RegExp(unique) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("All services"); // default scope on creation

  // Assign a single specific service.
  await row.getByRole("link", { name: "Services" }).click();
  await page.waitForURL("**/dashboard/staff/*/services");
  await page.getByLabel("Can perform all services").uncheck();
  await page.getByRole("checkbox").nth(1).check(); // first specific-service checkbox
  await page.getByRole("button", { name: "Save" }).click();

  await page.waitForURL("**/en/dashboard/staff");
  await expect(page.getByRole("row", { name: new RegExp(unique) })).toContainText("1 selected");

  // Same session, Arabic dashboard: layout flips to RTL and the barber is listed.
  await page.goto("/ar/dashboard/staff");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "الحلاقون" })).toBeVisible();
  await expect(page.getByRole("link", { name: "إضافة حلاق" })).toBeVisible();
  await expect(page.getByText(unique).first()).toBeVisible();
});
