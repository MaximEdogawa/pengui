import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

interface WithThemeProps {
  children: ReactNode;
  /** Force a specific theme for tests. Defaults to "light". */
  theme?: "light" | "dark";
}

/**
 * Wraps children in next-themes ThemeProvider for components that call useTheme().
 *
 * Note: CT tests run inside a Vite iframe without an <html> element that
 * next-themes can control, so use defaultTheme to force a specific theme and
 * avoid flakiness from system preference detection.
 */
export function WithTheme({ children, theme = "light" }: WithThemeProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme={theme} forcedTheme={theme}>
      {children}
    </ThemeProvider>
  );
}
