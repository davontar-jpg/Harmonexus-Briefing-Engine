import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "dist", "apps-script");
await fs.rm(output, {recursive:true, force:true});
await fs.mkdir(output, {recursive:true});
await fs.copyFile(path.join(root, "appsscript.json"), path.join(output, "appsscript.json"));
const modules = (await fs.readdir(path.join(root, "src"))).filter(name => name.endsWith(".gs")).sort();
for (const module of modules) await fs.copyFile(path.join(root, "src", module), path.join(output, module));
console.log(`Built Apps Script package with ${modules.length} modules at ${output}`);
