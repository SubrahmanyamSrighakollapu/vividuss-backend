const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : file.endsWith(".js") ? [file] : [];
  });
}
const files = ["src", "tests", "scripts"].flatMap(walk);
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) process.exit(1);
}
console.log(`Syntax checked ${files.length} JavaScript files`);
