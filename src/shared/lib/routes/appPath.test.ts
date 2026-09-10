import { describe, expect, it } from "bun:test";
import { isLoginPath, normalizeAppPath } from "./appPath";

describe("normalizeAppPath", () => {
  it("leaves clean browser routes untouched", () => {
    expect(normalizeAppPath("/")).toBe("/");
    expect(normalizeAppPath("/login")).toBe("/login");
    expect(normalizeAppPath("/dashboard")).toBe("/dashboard");
    expect(normalizeAppPath("/wallet/abc123")).toBe("/wallet/abc123");
  });

  it("resolves the Sage-served entry document to the root route", () => {
    expect(normalizeAppPath("/index.html")).toBe("/");
    expect(normalizeAppPath("/index")).toBe("/");
    expect(normalizeAppPath("")).toBe("/");
  });

  it("strips the .html the static export writes for each route", () => {
    expect(normalizeAppPath("/dashboard.html")).toBe("/dashboard");
    expect(normalizeAppPath("/login.html")).toBe("/login");
  });

  it("collapses a trailing slash without eating the root", () => {
    expect(normalizeAppPath("/dashboard/")).toBe("/dashboard");
    expect(normalizeAppPath("/")).toBe("/");
  });
});

describe("isLoginPath", () => {
  it("matches the login screen in a browser", () => {
    expect(isLoginPath("/")).toBe(true);
    expect(isLoginPath("/login")).toBe(true);
  });

  it("matches the login screen as Sage serves it", () => {
    // The bug: Sage's webview reported /index.html, so a literal `=== "/"`
    // check reported "not the login page" and the redirect never ran.
    expect(isLoginPath("/index.html")).toBe(true);
    expect(isLoginPath("/login.html")).toBe(true);
    expect(isLoginPath("/login/")).toBe(true);
  });

  it("does not match other routes", () => {
    expect(isLoginPath("/dashboard")).toBe(false);
    expect(isLoginPath("/dashboard.html")).toBe(false);
    expect(isLoginPath("/trading")).toBe(false);
    expect(isLoginPath("/wallet/abc")).toBe(false);
  });
});
