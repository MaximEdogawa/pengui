# App Components

This directory documents the composed app-shell components introduced during the shadcn/ui migration.

The implementation currently lives under `src/features/dashboard/ui/` and `src/shared/ui/`.

## Dashboard Shell

### `DashboardLayout`

Path: `src/features/dashboard/ui/widgets/DashboardLayout.tsx`

Usage:

```tsx
import DashboardLayout from "@/features/dashboard/ui/widgets/DashboardLayout";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
```

### `Header`

Path: `src/features/dashboard/ui/components/Header.tsx`

Usage:

```tsx
import { Header } from "@/features/dashboard/ui/components/Header";
import { getThemeClasses } from "@/shared/lib/theme";

const t = getThemeClasses(false);

<Header t={t} isDark={false} />;
```

### `DashboardSidebar`

Path: `src/features/dashboard/ui/components/DashboardSidebar.tsx`

Usage:

```tsx
import { SidebarProvider } from "@/shared/ui/components/ui/sidebar";
import { DashboardSidebar } from "@/features/dashboard/ui/components/DashboardSidebar";
import { getThemeClasses } from "@/shared/lib/theme";

const t = getThemeClasses(false);

<SidebarProvider defaultOpen>
  <DashboardSidebar activeItem="dashboard" t={t} isDark={false} onToggleTheme={() => {}} />
</SidebarProvider>;
```

## Shared Primitives

### `Button`

Path: `src/shared/ui/primitives/button/Button.tsx`

Usage:

```tsx
import Button from "@/shared/ui/primitives/button/Button";

<Button variant="primary" size="md">
  Save
</Button>;
```

### `Modal`

Path: `src/shared/ui/primitives/modal/Modal.tsx`

Usage:

```tsx
import Modal from "@/shared/ui/primitives/modal/Modal";

{
  isOpen ? (
    <Modal onClose={() => setOpen(false)} maxWidth="max-w-xl">
      <div>Dialog content</div>
    </Modal>
  ) : null;
}
```

## Notes

- The app shell uses shadcn/ui `Sidebar`, `Dialog`, `Tooltip`, `Button`, `Separator`, and `Sheet` primitives.
- `DashboardLayout` lazy-loads `DashboardSidebar`.
- `Modal` lazy-loads `ModalImpl` so dialog code is deferred until first use.
- Playwright CT coverage currently lives in `tests/ct/`.
