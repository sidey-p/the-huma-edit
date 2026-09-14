/**
 * Strip em dashes from source strings. Replacements:
 *  " — " (spaced)  -> ": " when followed by lowercase explanation, else " - "
 *  "—" (joined)    -> "-"
 *  leading/trailing in strings -> removed
 * Only touches .ts/.tsx files in src/.
 */
const fs = require("fs");
const path = require("path");

const EM = "\u2014";

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

let touched = 0;
for (const file of walk(path.join(__dirname, "..", "src"))) {
  let src = fs.readFileSync(file, "utf8");
  if (!src.includes(EM)) continue;

  let next = src;

  // spaced em dash: pick ":" if next char is lowercase, else " - "
  next = next.replace(
    new RegExp(`${EM} `, "g"),
    (m, offset, str) => {
      const nextChar = str[offset + 2] ?? "";
      return /[a-z"']/.test(nextChar) ? ": " : " - ";
    },
  );

  // any remaining joined em dashes
  next = next.split(EM).join("-");

  if (next !== src) {
    fs.writeFileSync(file, next, "utf8");
    touched++;
    console.log("cleaned", path.relative(process.cwd(), file));
  }
}
console.log(`done: ${touched} files`);
