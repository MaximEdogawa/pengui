import { expect, test } from "@playwright/experimental-ct-react";
import { DEFAULT_FEATURE_FLAGS, MENU_ID_TO_FLAG } from "@/shared/config/featureFlags";
import { SidebarStory } from "./stories/SidebarStory";

/**
 * Component tests for DashboardSidebar.
 *
 * Uses the SidebarStory wrapper (in a separate file — required by Playwright CT).
 * Tests run at Desktop Chrome viewport (1280x720) which is >= 1024px so the
 * desktop sidebar is always rendered.
 */

/**
 * The CT sandbox has no NEXT_PUBLIC_FEATURE_FLAGS, so `useMenuItems()` applies
 * DEFAULT_FEATURE_FLAGS (dashboard, offers, trading, wallet): four nav links
 * plus the profile link. Derived from the flag config rather than hard-coded
 * so the test follows the baseline instead of drifting from it.
 */
const ENABLED_NAV_LINKS = Object.values(MENU_ID_TO_FLAG).filter((flag) =>
  DEFAULT_FEATURE_FLAGS.includes(flag)
).length;

test.describe("DashboardSidebar", () => {
  test("renders the nav items enabled by the default feature flags plus the profile link", async ({
    mount,
  }) => {
    const component = await mount(<SidebarStory />);
    const links = component.getByRole("link");
    await expect(links).toHaveCount(ENABLED_NAV_LINKS + 1);
    await expect(component.getByRole("link", { name: /dashboard/i })).toBeVisible();
    await expect(component.getByRole("link", { name: /wallet/i })).toBeVisible();
  });

  test("hides nav items whose feature flag is off by default", async ({ mount }) => {
    const component = await mount(<SidebarStory />);
    await expect(component.getByRole("link", { name: /loans/i })).toHaveCount(0);
    await expect(component.getByRole("link", { name: /piggy bank/i })).toHaveCount(0);
    await expect(component.getByRole("link", { name: /option contracts/i })).toHaveCount(0);
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
