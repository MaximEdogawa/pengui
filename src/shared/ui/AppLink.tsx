'use client';

import NextLink from 'next/link';
import type { ComponentProps } from 'react';

/**
 * Standard in-app navigation link. Uses Next.js Link with default prefetch
 * so route loading works the same on all network conditions. Use for
 * dashboard, wallet, and other internal routes.
 */
export function AppLink(props: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} />;
}
