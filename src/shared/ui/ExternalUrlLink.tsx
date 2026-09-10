"use client";

import type { AnchorHTMLAttributes } from "react";
import { isSageRuntime } from "@/shared/lib/wallet/detectWalletRuntime";
import { openExternalUrl } from "@/shared/lib/wallet/sage-bridge/openExternalUrl";

export interface ExternalUrlLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
}

/**
 * Anchor for links that leave the app (`target="_blank"` today).
 *
 * Sage's app webview denies `window.open` / `target="_blank"` navigation
 * (only the app's own origin is navigable); every external link has to go
 * through `environment.openExternalUrl` instead (AC #8). In an ordinary
 * browser this renders a plain `target="_blank"` anchor — no behaviour
 * change there.
 */
export function ExternalUrlLink({ href, onClick, children, ...rest }: ExternalUrlLinkProps) {
  if (!isSageRuntime()) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={onClick} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
        void openExternalUrl(href);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
