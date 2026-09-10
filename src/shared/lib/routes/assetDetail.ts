/**
 * Asset detail routing.
 *
 * The hosted Next.js deployment serves the dynamic route `/wallet/[assetId]`.
 * The Sage snapshot is a static file tree with no server and no SPA fallback,
 * so a dynamic segment would only resolve for pre-rendered ids. The Sage build
 * therefore links to the static `/wallet/asset?id=<slug>` route instead, which
 * renders the same view from a query parameter.
 */

import { CHIA_ASSET_IDS } from "@/shared/lib/constants/chia-assets";

/** True in the static snapshot produced by `bun run build:sage`. */
export const IS_STATIC_SNAPSHOT = process.env.NEXT_PUBLIC_SAGE_BUILD === "1";

/** Slug used for XCH itself (the asset list has no asset id for it). */
export const XCH_ASSET_SLUG = "xch";

/** Dynamic-segment params pre-rendered for `/wallet/[assetId]` in a static export. */
export const STATIC_ASSET_DETAIL_PARAMS = [{ assetId: XCH_ASSET_SLUG }];

/** Map an asset id to the slug used in the asset detail URL. */
export function assetDetailSlug(assetId: string): string {
  return assetId === CHIA_ASSET_IDS.XCH || assetId === "" ? XCH_ASSET_SLUG : assetId;
}

/** Href of the asset detail view for an asset id, valid for the current build target. */
export function assetDetailHref(assetId: string): string {
  const slug = encodeURIComponent(assetDetailSlug(assetId));
  return IS_STATIC_SNAPSHOT ? `/wallet/asset?id=${slug}` : `/wallet/${slug}`;
}
