#!/usr/bin/env bun
/* eslint-disable no-console -- CLI script: its output is the report */
/**
 * Verify that every package imported from src/, scripts/, tests/ and the root
 * config files is declared in package.json (TASK-009 AC #1).
 *
 *   bun run check:deps
 *
 * Transitive-only packages resolve today because bun hoists them into
 * node_modules, and silently break on the next lockfile change. Exit code 1
 * lists each undeclared package with one file that imports it. Declared
 * packages that nothing imports are printed as information only: most of them
 * are tooling (eslint plugins, tailwind, husky) that is used by name, not by
 * import.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { builtinModules } from "node:module";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SCAN_DIRS = ["src", "scripts", "tests"];
const ROOT_FILES = readdirSync(ROOT).filter((name) =>
  /^(next|playwright[\w-]*|tailwind|postcss|eslint)\.config\.(ts|mjs|js|cjs)$/.test(name)
);
const EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const SKIP_DIRS = new Set(["node_modules", ".next", "out", "coverage", "__snapshots__"]);

/** Packages resolved by the runtime rather than node_modules. */
const RUNTIME_PROVIDED = new Set(["bun", "bun:test", "bun:ffi", "bun:sqlite", "bun:jsc"]);

const IMPORT_PATTERNS = [
  /\bimport\s+(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/g,
  /\bexport\s+(?:\*|\{[^}]*\})\s*from\s+["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
];

function walk(dir: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      walk(full, out);
    } else if (EXTENSIONS.has(entry.slice(entry.lastIndexOf(".")))) {
      out.push(full);
    }
  }
}

function packageName(specifier: string): string | null {
  if (
    specifier.startsWith(".") ||
    specifier.startsWith("/") ||
    specifier.startsWith("@/") ||
    specifier.startsWith("node:") ||
    specifier.startsWith("data:") ||
    RUNTIME_PROVIDED.has(specifier)
  ) {
    return null;
  }
  const segments = specifier.split("/");
  const name = specifier.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0];
  if (builtinModules.includes(name)) return null;
  return name;
}

function importsOf(file: string): string[] {
  const source = readFileSync(file, "utf8");
  const found = new Set<string>();
  for (const pattern of IMPORT_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const name = packageName(match[1]);
      if (name) found.add(name);
    }
  }
  return Array.from(found);
}

const packageJson = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};
const declared = new Set([
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.devDependencies ?? {}),
]);

const files: string[] = [];
for (const dir of SCAN_DIRS) walk(join(ROOT, dir), files);
for (const name of ROOT_FILES) files.push(join(ROOT, name));

const firstImporter = new Map<string, string>();
for (const file of files) {
  for (const name of importsOf(file)) {
    if (!firstImporter.has(name)) firstImporter.set(name, relative(ROOT, file));
  }
}

const undeclared = Array.from(firstImporter.keys())
  .filter((name) => !declared.has(name))
  .sort();
const unused = Array.from(declared)
  .filter((name) => !firstImporter.has(name))
  .sort();

console.log(`Scanned ${files.length} files, ${firstImporter.size} imported packages.`);
if (unused.length) {
  console.log(`\nDeclared but never imported (tooling, or candidates for removal):`);
  for (const name of unused) console.log(`  - ${name}`);
}
if (undeclared.length) {
  console.error(`\nImported but not declared in package.json:`);
  for (const name of undeclared) console.error(`  - ${name}  (e.g. ${firstImporter.get(name)})`);
  process.exit(1);
}
console.log(`\nEvery imported package is declared.`);
