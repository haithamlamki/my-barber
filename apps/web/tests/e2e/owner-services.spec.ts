import { test, expect } from "@playwright/test";
import { clearMailbox, waitForOtp } from "./helpers/mail";

const OWNER_EMAIL = "owner@demo.local";

// One owner session covers both directions: auth is cookie-based, so after a
// single OTP login we can visit the Arabic dashboard in the same context
// without tripping GoTrue's 60s per-email OTP cooldown.
test("owner signs in, creates a service (en LTR), and sees the dashboard in Arabic (RTL)", async ({
  page,
}) => {
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
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { name: "Services" })).toBeVisible();

  // Create a service.
  const unique = `E2E Cut ${Date.now()}`;
  await page.getByRole("link", { name: "Add service" }).click();
  await page.waitForURL("**/en/dashboard/services/new");
  await page.fill('input[name="name_ar"]', "قصة اختبار");
  await page.fill('input[name="name_en"]', unique);
  await page.fill('input[name="duration_min"]', "45");
  await page.fill('input[name="price_minor"]', "3500");
  await page.getByRole("button", { name: "Save service" }).click();

  await page.waitForURL("**/en/dashboard/services");
  const row = page.getByRole("row", { name: new RegExp(unique) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("3.500"); // minor-units formatter: 3500 baisa = 3.500 OMR

  // Same session, Arabic dashboard: layout flips to RTL and copy is Arabic.
  await page.goto("/ar/dashboard/services");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "الخدمات" })).toBeVisible();
  await expect(page.getByRole("link", { name: "إضافة خدمة" })).toBeVisible();
  // The just-created service shows its Arabic name in the ar view.
  await expect(page.getByText("قصة اختبار").first()).toBeVisible();
});
