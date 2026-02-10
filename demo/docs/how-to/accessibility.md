# How to Build Accessible Gates

> Contributed by @grok

Goal: ensure gates and their outputs support accessibility (a11y) best practices.

## Why accessibility matters for gates

Gates that drive browser actions interact with real UIs. If your gate triggers a signup flow, the UI it tests should be accessible. Gates can **verify** accessibility, not just functionality.

## Adding alt text in browser gate examples

When gates use `Act.browser()` to test pages with images, ensure the pages under test include alt text. You can assert this with a custom gate:

```ts
import { Gate, Act, Assert, createHttpObserveResource } from "gateproof";

export async function run() {
  return Gate.run({
    name: "images-have-alt-text",
    observe: createHttpObserveResource({ url: "https://app.example.com/logs" }),
    act: [
      Act.browser({
        url: "https://app.example.com",
        headless: true,
        waitMs: 3000,
      }),
    ],
    assert: [
      Assert.custom("all_images_have_alt", async () => {
        // Use playwright to check all images have alt text
        const { chromium } = await import("playwright");
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto("https://app.example.com");
        const images = await page.locator("img").all();
        const results = await Promise.all(
          images.map(async (img) => {
            const alt = await img.getAttribute("alt");
            return alt !== null && alt.trim().length > 0;
          })
        );
        await browser.close();
        return results.every(Boolean);
      }),
      Assert.noErrors(),
    ],
    stop: { idleMs: 3000, maxMs: 30000 },
  });
}
```

## ARIA attributes for report UIs

If you build a UI to display gate results (e.g., a dashboard), use ARIA attributes for screen reader support:

```html
<!-- Gate result status -->
<div role="status" aria-live="polite" aria-label="Gate result">
  <span aria-label="Gate passed">pass</span>
</div>

<!-- Evidence list -->
<ul role="list" aria-label="Evidence collected">
  <li role="listitem">Action: user_created</li>
  <li role="listitem">Stage: signup_complete</li>
</ul>

<!-- Gate progress -->
<div role="progressbar" aria-valuenow="3" aria-valuemin="0" aria-valuemax="7"
     aria-label="PRD progress: 3 of 7 stories passed">
</div>

<!-- Error summary -->
<div role="alert" aria-label="Gate failure details">
  <p>Gate "user-signup" failed: HasAction: missing 'user_created'</p>
</div>
```

## Accessibility gates for common checks

### Color contrast gate

```ts
Assert.custom("color_contrast_ok", async () => {
  // Check WCAG AA contrast ratios on key elements
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://app.example.com");

  // Use axe-core for automated a11y testing
  await page.addScriptTag({ url: "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.0/axe.min.js" });
  const results = await page.evaluate(() => (window as any).axe.run());
  await browser.close();

  return results.violations.length === 0;
})
```

### Keyboard navigation gate

```ts
Assert.custom("keyboard_navigable", async () => {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://app.example.com");

  // Tab through interactive elements and verify focus is visible
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  await browser.close();

  return focused !== "BODY"; // Something received focus
})
```

## Tips

- Use `axe-core` via Playwright for automated WCAG checks in gates
- Assert alt text, ARIA labels, and keyboard navigation as positive evidence
- Gate results are JSON-serializable by default, making them screen-reader-pipeline friendly
- When building report UIs, follow WCAG 2.1 AA as a baseline

## Related

- How-to: `docs/how-to/add-a-gate.md`
- Reference: `docs/reference/api.md`
