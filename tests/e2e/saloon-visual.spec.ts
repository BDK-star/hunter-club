import { expect, test } from "@playwright/test";

test("critical saloon states match the reviewed visual baseline", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "reduced-motion");

  await page.goto("/");
  await expect(page.locator("summary.saloon-door")).toBeInViewport();
  await expect(page).toHaveScreenshot("01-exterior-closed.png", {
    fullPage: true,
  });

  await page.locator("summary.saloon-door").click();
  await expect(page.locator(".entry-panel")).toBeInViewport();
  await expect(page).toHaveScreenshot("02-exterior-entry-open.png", {
    fullPage: true,
  });

  await page.goto("/saloon?spoilers=safe");
  await expect(page).toHaveScreenshot("03-hall.png", { fullPage: true });

  await page.locator("#npc-explorer summary").click();
  await expect(page.getByText(/第一次来/)).toBeVisible();
  await expect(page).toHaveScreenshot("04-explorer-dialogue.png", {
    fullPage: true,
  });

  await page.goto("/library");
  await expect(page).toHaveScreenshot("05-library.png", { fullPage: true });
});
