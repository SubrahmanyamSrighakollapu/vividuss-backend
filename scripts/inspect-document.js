// Read-only fixture/export validation; never connects to a database or writes data.
const fs = require("node:fs");
const { inspectDocument } = require("../shared/website-contract/index.cjs");
if (!process.argv[2]) {
  console.error("Usage: node scripts/inspect-document.js <document.json>");
  process.exitCode = 2;
} else {
  const report = inspectDocument(JSON.parse(fs.readFileSync(process.argv[2], "utf8")));
  console.log(JSON.stringify(report, null, 2));
  if (report.errors.length) process.exitCode = 1;
}
