import { expect, test } from "@playwright/experimental-ct-react";
import { SidebarStory } from "./stories/SidebarStory";

/**
 * Component tests for DashboardSidebar.
 *
 * Uses the SidebarStory wrapper (in a separate file — required by Playwright CT).
 * Tests run at Desktop Chrome viewport (1280x720) which is >= 1024px so the
 * desktop sidebar is always rendered.
 */

test.describe("DashboardSidebar", () => {
  test("renders all nav menu items", async ({ mount }) => {
    const component = await mount(<SidebarStory />);
    // 7 nav links + 1 profile link = 8 links total
    const links = component.getByRole("link");
    await expect(links).toHaveCount(8);
  });

  test("active item has data-active=true", async ({ mount }) => {
    const component = await mount(<SidebarStory activeItem="offers" />);
    const activeBtn = component.locator('[data-active="true"]');
    await expect(activeBtn).toBeVisible();
    await expect(activeBtn).toContainText("Offers");
  });

  test("only one item has data-active=true", async ({ mount }) => {
    const component = await mount(<SidebarStory activeItem="dashboard" />);
    await expect(component.locator('[data-active="true"]')).toHaveCount(1);
  });

  test("renders logo toggle button", async ({ mount }) => {
    const component = await mount(<SidebarStory />);
    await expect(
      component.locator('[data-sidebar="menu-button"][aria-label="Toggle sidebar"]')
    ).toBeVisible();
  });

  test("renders theme toggle button", async ({ mount }) => {
    const component = await mount(<SidebarStory />);
    await expect(component.getByRole("button").filter({ hasText: /mode/i })).toBeVisible();
  });

  test("calls onToggleTheme when theme button clicked", async ({ mount }) => {
    let toggled = false;
    const component = await mount(<SidebarStory onToggleTheme={() => (toggled = true)} />);
    await component.getByRole("button").filter({ hasText: /mode/i }).click();
    expect(toggled).toBe(true);
  });

  test("profile link points to /profile", async ({ mount }) => {
    const component = await mount(<SidebarStory />);
    await expect(component.getByRole("link", { name: /profile|user/i }).first()).toHaveAttribute(
      "href",
      "/profile"
    );
  });
});
