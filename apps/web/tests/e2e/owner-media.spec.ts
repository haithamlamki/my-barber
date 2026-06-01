import { test, expect } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { clearMailbox, waitForOtp } from "./helpers/mail";

const OWNER_EMAIL = "owner@demo.local";
const here = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_IMAGE = path.join(here, "fixtures", "sample.png");

// One owner session: upload a photo on a new service and a new barber, confirm the
// list thumbnails render from signed URLs, then confirm the locale switcher flips
// the dashboard to Arabic (RTL) while preserving the path.
test("owner uploads service + barber photos and switches locale", async ({ page }) => {
  test.setTimeout(90_000); // OTP poll + two uploads + provisioning span many requests
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

  // --- Service with a photo ---
  const serviceName = `E2E Photo Service ${Date.now()}`;
  await page.getByRole("link", { name: "Add service" }).click();
  await page.waitForURL("**/en/dashboard/services/new");
  await page.fill('input[name="name_ar"]', "خدمة بصورة");
  await page.fill('input[name="name_en"]', serviceName);
  await page.fill('input[name="duration_min"]', "30");
  await page.fill('input[name="price_minor"]', "5000");
  await page.setInputFiles('input[name="image"]', SAMPLE_IMAGE);
  await page.getByRole("button", { name: "Save service" }).click();

  await page.waitForURL("**/en/dashboard/services");
  const serviceRow = page.getByRole("row", { name: new RegExp(serviceName) });
  await expect(serviceRow).toBeVisible();
  const serviceThumb = serviceRow.locator("img");
  await expect(serviceThumb).toBeVisible();
  await expect(serviceThumb).toHaveAttribute("src", /business-media/);

  // --- Barber with a photo ---
  const barberName = `E2E Photo Barber ${Date.now()}`;
  const email = `e2e.photo.${Date.now()}@demo.local`;
  await page.getByRole("link", { name: "Barbers" }).click();
  await page.waitForURL("**/en/dashboard/staff");
  await page.getByRole("link", { name: "Add barber" }).click();
  await page.waitForURL("**/en/dashboard/staff/new");
  await page.fill('input[name="display_name"]', barberName);
  await page.fill('input[name="email"]', email);
  await page.setInputFiles('input[name="image"]', SAMPLE_IMAGE);
  await page.getByRole("button", { name: "Save barber" }).click();

  await page.waitForURL("**/en/dashboard/staff");
  const barberRow = page.getByRole("row", { name: new RegExp(barberName) });
  await expect(barberRow).toBeVisible();
  const barberThumb = barberRow.locator("img");
  await expect(barberThumb).toBeVisible();
  await expect(barberThumb).toHaveAttribute("src", /business-media/);

  // --- Locale switcher: en -> ar, path preserved, RTL flip ---
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await page.getByRole("link", { name: "العربية" }).click();
  await page.waitForURL("**/ar/dashboard/staff");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { name: "الحلاقون" })).toBeVisible();
});
