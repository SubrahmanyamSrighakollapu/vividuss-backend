// Read-only verification of the exact representative fixtures captured before
// migration. M3 history fixtures stay immutable until the owned container is removed.
const fs = require("node:fs");
const assert = require("node:assert/strict");
const { connectDisposable } = require("./disposable-target");
const { capture } = require("./rehearse-data");
async function main() {
  const expected = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const { prisma, identity } = await connectDisposable();
  try {
    const evidence = await capture({ $queryRawUnsafe: async sql => {
      const table = sql.match(/FROM "([^"]+)"/)?.[1];
      if (!expected.tables[table]) throw new Error("Unexpected preservation query");
      return prisma.$queryRawUnsafe(sql.replace(' ORDER BY "id"', ' WHERE "id" = ANY($1::text[]) ORDER BY "id"'), expected.tables[table].ids);
    } });
    assert.deepEqual(evidence, expected);
    const extra = {};
    for (const table of Object.keys(expected.tables)) {
      if (!["Template","TemplatePage","TemplateSection","Website","WebsitePage","WebsiteSection"].includes(table)) throw new Error("Unexpected table");
      const rows = await prisma.$queryRawUnsafe('SELECT "id" FROM "' + table + '" WHERE NOT ("id" = ANY($1::text[]))', expected.tables[table].ids);
      for (const row of rows) {
        if (/^m3-/.test(row.id)) continue;
        let actor;
        if (table === "Website") actor = (await prisma.website.findUnique({where:{id:row.id},select:{userId:true}}))?.userId;
        else if (table === "WebsitePage") actor = (await prisma.websitePage.findUnique({where:{id:row.id},select:{website:{select:{userId:true}}}}))?.website.userId;
        else if (table === "WebsiteSection") actor = (await prisma.websiteSection.findUnique({where:{id:row.id},select:{page:{select:{website:{select:{userId:true}}}}}}))?.page.website.userId;
        assert.ok(actor?.startsWith("m3-"), "Unexpected extra rows in " + table);
      }
      extra[table] = rows.length;
    }
    const ledger = await prisma.$queryRawUnsafe('SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL ORDER BY migration_name');
    const result = { preservation: "PASS", identity, original: evidence, extraDisposableFixtureRows: extra,
      migrationLedger: ledger.map(row => row.migration_name), note: "Original captured rows/ownership/JSON hashes unchanged; new immutable M3 fixtures retained until whole disposable-container cleanup." };
    if (process.argv[3]) fs.writeFileSync(process.argv[3], JSON.stringify(result,null,2)+"\n");
    console.log(JSON.stringify(result,null,2));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode=1; });
