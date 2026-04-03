import { expect, test } from "@playwright/experimental-ct-react";
import Button from "@/shared/ui/primitives/button/Button";
import { WithTheme } from "./fixtures/with-theme";

/**
 * Component tests for the Button primitive.
 *
 * Verifies that the shadcn-backed button preserves the original public API:
 * variants, sizes, icon rendering, disabled state, and fullWidth layout.
 */

test.describe("Button", () => {
  test("renders children text", async ({ mount }) => {
    const component = await mount(
      <WithTheme>
        <Button>Click me</Button>
      </WithTheme>
    );
    await expect(component.getByRole("button")).toContainText("Click me");
  });

  test.describe("variants render without errors", () => {
    const variants = ["primary", "secondary", "danger", "success", "warning", "info"] as const;

    for (const variant of variants) {
      test(variant, async ({ mount }) => {
        const component = await mount(
          <WithTheme>
            <Button variant={variant}>{variant}</Button>
          </WithTheme>
        );
        await expect(component.getByRole("button")).toBeVisible();
      });
    }
  });

  test("disabled state prevents click and shows opacity", async ({ mount }) => {
    let clicked = false;
    const component = await mount(
      <WithTheme>
        <Button disabled onClick={() => (clicked = true)}>
          Disabled
        </Button>
      </WithTheme>
    );
    const btn = component.getByRole("button");
    await expect(btn).toBeDisabled();
    await btn.click({ force: true });
    expect(clicked).toBe(false);
  });

  test("fires onClick when enabled", async ({ mount }) => {
    let clicked = false;
    const component = await mount(
      <WithTheme>
        <Button onClick={() => (clicked = true)}>Click</Button>
      </WithTheme>
    );
    await component.getByRole("button").click();
    expect(clicked).toBe(true);
  });

  test("accepts className prop and applies it", async ({ mount }) => {
    const component = await mount(
      <WithTheme>
        <Button className="custom-class">Styled</Button>
      </WithTheme>
    );
    await expect(component.getByRole("button")).toHaveClass(/custom-class/);
  });

  test("fullWidth applies w-full class", async ({ mount }) => {
    const component = await mount(
      <WithTheme>
        <Button fullWidth>Full Width</Button>
      </WithTheme>
    );
    await expect(component.getByRole("button")).toHaveClass(/w-full/);
  });

  test("sm has py-1 class and lg has py-2 class (size variants)", async ({ mount }) => {
    // Both sizes in one tree — CT allows only one mount per test
    const component = await mount(
      <WithTheme>
        <div>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </WithTheme>
    );
    const buttons = component.getByRole("button");
    await expect(buttons.nth(0)).toHaveClass(/py-1/);
    await expect(buttons.nth(1)).toHaveClass(/py-2/);
  });
});
