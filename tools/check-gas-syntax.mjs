import fs from "node:fs";
import path from "node:path";

JSON.parse(fs.readFileSync("appsscript.json", "utf8"));

const files = fs.readdirSync("src").filter(name => name.endsWith(".gs")).sort();
for (const file of files) {
  const source = fs.readFileSync(path.join("src", file), "utf8");
  try { new Function(source); }
  catch (error) { console.error(`${file}: ${error.message}`); process.exitCode = 1; }
}
if (!process.exitCode) console.log(`Syntax OK: manifest JSON + ${files.length} Apps Script modules`);
