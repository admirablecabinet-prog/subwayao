/**
 * refactor-game-modular.mjs
 *
 * One-time refactor of public/game/index.html:
 *   - extracts the inline <style> block  -> public/game/game.css
 *   - extracts the inline boot <script> -> public/game/game.js
 *   - adds <link rel="preload"> hints for the critical engine scripts,
 *     config, splash and fonts (so they start downloading as soon as the
 *     HTML parses, in parallel, instead of waiting for the boot script)
 *   - removes a redundant Google-Fonts @import (fonts are served locally)
 *   - removes the "?v=110kz" cache-buster query (improves cache hits)
 *   - fixes a stray duplicate </script> tag
 *
 * The engine (/js/*) and assets (/assets/*) are left untouched — the
 * minified engine hardcodes those paths, so renaming them would break it.
 *
 * Usage: node scripts/refactor-game-modular.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const page = join(root, "public", "game", "index.html");
const cssOut = join(root, "public", "game", "game.css");
const jsOut = join(root, "public", "game", "game.js");

const html = readFileSync(page, "utf8");

/* ---------------------------------------------------------------
 * 1. Extract inline <style> -> game.css
 * --------------------------------------------------------------- */
const styleOpen = html.indexOf("<style>");
const styleClose = html.indexOf("</style>");
if (styleOpen < 0 || styleClose < 0) throw new Error("style block not found");

let css = html.slice(styleOpen + "<style>".length, styleClose);
css = css.replace(
  /@import url\('https:\/\/fonts\.googleapis\.com\/[^']*'\);\s*/g,
  "",
);
writeFileSync(cssOut, css.trim() + "\n", "utf8");

/* ---------------------------------------------------------------
 * 2. Extract inline boot <script> -> game.js
 *    (from the "<script>" before "// Clear all saved progress"
 *     through the stray second "</script>")
 * --------------------------------------------------------------- */
const bootMarker = "// Clear all saved progress";
const bootIdx = html.indexOf(bootMarker);
if (bootIdx < 0) throw new Error("boot script not found");
const scriptOpen = html.lastIndexOf("<script>", bootIdx);
const firstClose = html.indexOf("</script>", bootIdx);
const strayClose = html.indexOf("</script>", firstClose + 9);
if (scriptOpen < 0 || firstClose < 0 || strayClose < 0)
  throw new Error("could not locate boot script boundaries");

let js = html.slice(scriptOpen + "<script>".length, firstClose);
js = js
  .replace(/\/assets\/data\/config\.json\?v=110kz/g, "/assets/data/config.json")
  .replace(
    /\/assets\/font\/(lilita-one|titan-one)\.css\?v=110kz/g,
    "/assets/font/$1.css",
  )
  .replace(
    /\/assets\/preload\/splash_mip\.png\?v=110kz/g,
    "/assets/preload/splash_mip.png",
  )
  .replace(/src \+ '\?v=110kz'/g, "src");
writeFileSync(jsOut, js.trim() + "\n", "utf8");

/* ---------------------------------------------------------------
 * 3. Rebuild the page
 * --------------------------------------------------------------- */
const headReplacement =
  '<link rel="preload" href="/js/inflate.min.js" as="script">\n' +
  '<link rel="preload" href="/js/vendor.js" as="script">\n' +
  '<link rel="preload" href="/js/main.js" as="script">\n' +
  '<link rel="preload" href="/assets/data/config.json" as="fetch">\n' +
  '<link rel="preload" href="/assets/preload/splash_mip.png" as="image">\n' +
  '<link rel="preload" href="/assets/font/lilita-one.woff2" as="font" type="font/woff2" crossorigin>\n' +
  '<link rel="preload" href="/assets/font/titan-one.woff2" as="font" type="font/woff2" crossorigin>\n' +
  '<link rel="stylesheet" href="/game/game.css">';

const replaceEnd = strayClose + "</script>".length;

const newHtml =
  html.slice(0, styleOpen) +
  headReplacement +
  html.slice(styleClose + "</style>".length, scriptOpen) +
  '<script src="/game/game.js"></script>' +
  html.slice(replaceEnd);

writeFileSync(page, newHtml, "utf8");

console.log("Extracted CSS -> public/game/game.css (" + css.trim().length + " chars)");
console.log("Extracted JS  -> public/game/game.js  (" + js.trim().length + " chars)");
console.log("Rewrote       -> public/game/index.html (" + newHtml.length + " chars)");
