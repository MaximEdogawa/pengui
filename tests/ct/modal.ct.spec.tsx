import { expect, test } from "@playwright/experimental-ct-react";
import ModalImpl from "@/shared/ui/primitives/modal/ModalImpl";
import { WithTheme } from "./fixtures/with-theme";

/**
 * Component tests for the Modal/Dialog primitive.
 *
 * Tests ModalImpl directly (not the lazy-loaded Modal wrapper) since
 * next/dynamic is not available in the Vite CT sandbox.
 *
 * NOTE: shadcn's DialogContent renders via Radix Portal into document.body,
 * so assertions use `page.getByRole()` rather than `component.*`. The
 * component locator is still used for click targets inside the dialog.
 */

test.describe("Modal (ModalImpl)", () => {
  test("renders children content", async ({ mount, page }) => {
    await mount(
      <WithTheme>
        <ModalImpl onClose={() => {}}>
          <div data-testid="content">Hello Modal</div>
        </ModalImpl>
      </WithTheme>
    );
    await expect(page.getByTestId("content")).toContainText("Hello Modal");
  });

  test("is accessible as dialog role", async ({ mount, page }) => {
    await mount(
      <WithTheme>
        <ModalImpl onClose={() => {}}>
          <p>Content</p>
        </ModalImpl>
      </WithTheme>
    );
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("calls onClose when Escape key is pressed", async ({ mount, page }) => {
    let closed = false;
    await mount(
      <WithTheme>
        <ModalImpl onClose={() => (closed = true)}>
          <p>Escapable</p>
        </ModalImpl>
      </WithTheme>
    );
    await page.keyboard.press("Escape");
    expect(closed).toBe(true);
  });

  test("applies maxWidth class to dialog content", async ({ mount, page }) => {
    await mount(
      <WithTheme>
        <ModalImpl onClose={() => {}} maxWidth="max-w-sm">
          <p>Narrow</p>
        </ModalImpl>
      </WithTheme>
    );
    await expect(page.getByRole("dialog")).toHaveClass(/max-w-sm/);
  });

  test("closeOnOverlayClick=false prevents onClose on outside click", async ({ mount, page }) => {
    let closed = false;
    await mount(
      <WithTheme>
        <ModalImpl onClose={() => (closed = true)} closeOnOverlayClick={false}>
          <div style={{ width: 200, height: 200 }}>Content</div>
        </ModalImpl>
      </WithTheme>
    );
    // Click the overlay region (Radix portal overlay is fixed inset-0)
    await page.mouse.click(5, 5);
    expect(closed).toBe(false);
  });
});
