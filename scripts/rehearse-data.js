const fs = require("node:fs");
const crypto = require("node:crypto");
const assert = require("node:assert/strict");
const { connectDisposable } = require("./disposable-target");

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
}
const columns = {
  Template: '"id","name","description","category","thumbnail","createdAt","updatedAt"',
  TemplatePage: '"id","name","slug","order","templateId"',
  TemplateSection: '*', WebsiteSection: '*',
  Website: '"id","name","slug","userId","templateId","createdAt","updatedAt","isPublished","publishedAt","publishedData"',
  WebsitePage: '"id","name","slug","order","websiteId"',
};
async function capture(prisma) {
  const tables = {};
  for (const [table, selection] of Object.entries(columns)) {
    const rows = await prisma.$queryRawUnsafe(`SELECT ${selection} FROM "${table}" ORDER BY "id"`);
    tables[table] = { count: rows.length, ids: rows.map(row => row.id), sha256: crypto.createHash("sha256").update(canonical(rows)).digest("hex") };
  }
  const owners = await prisma.$queryRawUnsafe('SELECT "id","userId" FROM "Website" ORDER BY "id"');
  return { tables, owners };
}
async function main() {
  const { prisma, identity } = await connectDisposable();
  try {
    const [action, file] = process.argv.slice(2);
    if (action === "seed") {
      for (const table of Object.keys(columns)) {
        const [row] = await prisma.$queryRawUnsafe(`SELECT count(*)::int AS count FROM "${table}"`);
        assert.equal(row.count, 0, "Refusing to seed nonempty " + table);
      }
      const content = { heading: "Legacy café — preserved", description: "Representative fixture", unknown: { nested: [1, true, null, "世界"] } };
      const config = { backgroundColor: "#fff", spacing: { padding: { top: 32 } }, unknownToken: "preserve" };
      const snapshot = { schemaVersion: 1, name: "Legacy fixture", pages: [{ id: "legacy-wp", slug: "home", sections: [{ id: "legacy-ws", type: "hero", order: 0, content, config }] }], unknown: { preserve: true } };
      await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe('INSERT INTO "Template" (id,name,category,"updatedAt") VALUES ($1,$2,$3,now())', "legacy-t", "Legacy template", "Agency");
        await tx.$executeRawUnsafe('INSERT INTO "TemplatePage" (id,name,slug,"order","templateId") VALUES ($1,$2,$3,0,$4)', "legacy-tp", "Home", "home", "legacy-t");
        await tx.$executeRawUnsafe('INSERT INTO "TemplateSection" (id,type,"order",content,config,"pageId") VALUES ($1,$2,0,$3::jsonb,$4::jsonb,$5)', "legacy-ts", "hero", JSON.stringify(content), JSON.stringify(config), "legacy-tp");
        await tx.$executeRawUnsafe('INSERT INTO "Website" (id,name,slug,"userId","templateId","updatedAt","isPublished","publishedAt","publishedData") VALUES ($1,$2,$3,$4,$5,now(),true,now(),$6::jsonb)', "legacy-w", "Legacy fixture", "m15-legacy", "fixture-owner", "legacy-t", JSON.stringify(snapshot));
        await tx.$executeRawUnsafe('INSERT INTO "WebsitePage" (id,name,slug,"order","websiteId") VALUES ($1,$2,$3,0,$4)', "legacy-wp", "Home", "home", "legacy-w");
        await tx.$executeRawUnsafe('INSERT INTO "WebsiteSection" (id,type,"order",content,config,"pageId") VALUES ($1,$2,0,$3::jsonb,$4::jsonb,$5)', "legacy-ws", "hero", JSON.stringify(content), JSON.stringify(config), "legacy-wp");
      });
    }
    const evidence = await capture(prisma);
    if (action === "verify") assert.deepEqual(evidence, JSON.parse(fs.readFileSync(file, "utf8")));
    else fs.writeFileSync(file, JSON.stringify(evidence, null, 2) + "\n");
    console.log(JSON.stringify({ action, identity, preservation: "PASS", ...evidence }, null, 2));
  } finally { await prisma.$disconnect(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { canonical, capture };
