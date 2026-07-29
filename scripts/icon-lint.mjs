#!/usr/bin/env node
/**
 * Fail if any imported Lucide icon is a deprecated alias.
 *
 * Lucide keeps renamed icons exported under their old names, annotated
 * `@deprecated` in the type declarations but perfectly functional -- so nothing
 * breaks, nothing warns at build time, and the code quietly rots. This reads the
 * annotations out of the installed package and checks them against what `src/`
 * actually imports, so the list always matches the version in use rather than
 * something hand-maintained here.
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * `{ oldName: replacementName }`, straight from lucide's own annotations.
 *
 * Read via the node_modules path rather than `require.resolve`, because the
 * package's `exports` map deliberately hides everything except its icon entry
 * points -- including its own package.json.
 */
function deprecatedAliases() {
  const declarations = join(ROOT, "node_modules/lucide-solid/dist/types/aliases/aliases.d.ts");
  const src = readFileSync(declarations, "utf8");
  const out = new Map();
  // export { /** @deprecated … use {@link NewName} instead. */ default as OldName } from '…'
  const pattern =
    /@deprecated[^*]*?use \{@link ([A-Za-z0-9_]+)\}[^*]*\*\/\s*default as ([A-Za-z0-9_]+)\b/g;
  for (const m of src.matchAll(pattern)) out.set(m[2], m[1]);
  return out;
}

/** Every identifier imported from lucide-solid, with the file it came from. */
function importedIcons(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      importedIcons(path, found);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name)) continue;
    const text = readFileSync(path, "utf8");
    const pattern = /import\s*(?:type\s*)?\{([^}]+)\}\s*from\s*["']lucide-solid["']/g;
    for (const m of text.matchAll(pattern)) {
      for (const name of m[1].split(",").map((n) => n.trim())) {
        if (name) found.push({ name, file: relative(ROOT, path) });
      }
    }
  }
  return found;
}

const deprecated = deprecatedAliases();
if (deprecated.size === 0) {
  console.error("✘ found no @deprecated annotations -- has lucide-solid's layout changed?");
  process.exit(1);
}

const imports = importedIcons(join(ROOT, "src"));
const offenders = imports.filter((i) => deprecated.has(i.name));

console.log(
  `checked ${imports.length} lucide import(s) against ${deprecated.size} deprecated alias(es)`,
);

if (offenders.length > 0) {
  console.error("\n✘ deprecated Lucide icons in use:");
  for (const o of offenders) {
    console.error(`    ${o.name} -> use ${deprecated.get(o.name)}   ${o.file}`);
  }
  process.exit(1);
}

console.log("✔ no deprecated Lucide icons");
