import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const wcagTags = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoAutomatedA11yViolations(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
  expect(result.violations).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
}

async function activate(locator: Locator, projectName: string) {
  if (projectName === "mobile" || projectName === "tablet") {
    await locator.tap();
    return;
  }
  await locator.click();
}

test("visitor can complete the core journey with accessible controls", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "reduced-motion");

  await page.goto("/");
  const door = page.locator("summary.saloon-door");
  await expect(door).toBeVisible();
  await expect(door).toBeInViewport();
  const doorBox = await door.boundingBox();
  expect(doorBox?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(doorBox?.height ?? 0).toBeGreaterThanOrEqual(44);
  await expectNoHorizontalOverflow(page);
  await expectNoAutomatedA11yViolations(page);

  if (testInfo.project.name === "desktop") {
    await door.focus();
    await expect(door).toBeFocused();
    await door.press("Enter");
  } else {
    await activate(door, testInfo.project.name);
  }

  const entryPanel = page.locator(".entry-panel");
  await expect(entryPanel).toBeVisible();
  await expect(entryPanel).toBeInViewport();
  if (testInfo.project.name === "desktop") {
    await expect(page.locator(".site-header")).toBeInViewport();
    await expect(page.locator(".exterior-copy")).toBeInViewport();
  }
  await expectNoHorizontalOverflow(page);
  await expectNoAutomatedA11yViolations(page);

  await page.getByRole("radio", { name: /动画进度/ }).check();
  const enterButton = page.getByRole("button", { name: "以旅客身份进入" });
  if (testInfo.project.name === "desktop") {
    await enterButton.focus();
    await enterButton.press("Enter");
  } else {
    await activate(enterButton, testInfo.project.name);
  }

  await expect(page).toHaveURL(/\/saloon\?spoilers=anime$/);
  await expect(
    page.getByRole("heading", { name: "今夜，先问路，再谈冒险。" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoAutomatedA11yViolations(page);

  const explorer = page.locator("#npc-explorer summary");
  await expect(explorer).toBeVisible();
  await activate(explorer, testInfo.project.name);
  await activate(
    page.getByRole("button", { name: "带我去资料库" }),
    testInfo.project.name,
  );
  await activate(
    page.getByRole("link", { name: "带我去资料库" }),
    testInfo.project.name,
  );

  await expect(page).toHaveURL(/\/library$/);
  await expect(
    page.getByRole("heading", { name: "资料库不是百科抄写间。" }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoAutomatedA11yViolations(page);
});

test("standard URLs remain usable when JavaScript is disabled", async ({
  browser,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  const context = await browser.newContext({
    javaScriptEnabled: false,
    locale: "zh-CN",
    viewport: { height: 720, width: 1280 },
  });
  const page = await context.newPage();

  await page.goto("/");
  await page.getByRole("link", { name: "跳过场景，直接进入大厅" }).click();
  await expect(page).toHaveURL(/\/saloon\?spoilers=safe$/);
  await page.getByRole("link", { name: "资料库导览" }).click();
  await expect(page).toHaveURL(/\/library$/);

  await context.close();
});

test("reduced motion removes scene transitions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "reduced-motion");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const transitionDuration = await page
    .locator("summary.saloon-door")
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(transitionDuration).toBe("0s");

  await page.goto("/saloon?spoilers=safe");
  const npcTransitionDuration = await page
    .locator(".npc-sigil")
    .first()
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(npcTransitionDuration).toBe("0s");
});

test("first view stays inside the performance budget", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");

  await page.addInitScript(() => {
    const metrics = { cls: 0, lcp: 0 };
    Object.defineProperty(window, "__hunterMetrics", {
      configurable: false,
      value: metrics,
      writable: false,
    });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        metrics.lcp = Math.max(metrics.lcp, entry.startTime);
      }
    }).observe({ buffered: true, type: "largest-contentful-paint" });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & {
          hadRecentInput: boolean;
          value: number;
        };
        if (!shift.hadRecentInput) metrics.cls += shift.value;
      }
    }).observe({ buffered: true, type: "layout-shift" });
  });

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(100);

  const budgets = await page.evaluate(() => {
    const resources = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    const sizeFor = (
      predicate: (entry: PerformanceResourceTiming) => boolean,
    ) =>
      resources
        .filter(predicate)
        .reduce((sum, entry) => sum + entry.encodedBodySize, 0);
    const metrics = (
      window as typeof window & {
        __hunterMetrics: { cls: number; lcp: number };
      }
    ).__hunterMetrics;

    return {
      cls: metrics.cls,
      criticalBytes: sizeFor((entry) =>
        ["css", "fetch", "font", "img", "script"].includes(entry.initiatorType),
      ),
      fontBytes: sizeFor((entry) => entry.initiatorType === "font"),
      javascriptBytes: sizeFor((entry) => entry.initiatorType === "script"),
      lcpMilliseconds: metrics.lcp,
    };
  });

  const interactionMilliseconds = await page
    .locator("summary.saloon-door")
    .evaluate(async (element) => {
      const startedAt = performance.now();
      (element as HTMLElement).click();
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      return performance.now() - startedAt;
    });

  console.info(
    "Experience performance budget",
    JSON.stringify({ ...budgets, interactionMilliseconds }),
  );

  expect(budgets.criticalBytes).toBeLessThanOrEqual(1.2 * 1024 * 1024);
  expect(budgets.javascriptBytes).toBeLessThanOrEqual(250 * 1024);
  expect(budgets.fontBytes).toBeLessThanOrEqual(150 * 1024);
  expect(budgets.lcpMilliseconds).toBeLessThanOrEqual(2_500);
  expect(budgets.cls).toBeLessThanOrEqual(0.1);
  expect(interactionMilliseconds).toBeLessThanOrEqual(200);
});
