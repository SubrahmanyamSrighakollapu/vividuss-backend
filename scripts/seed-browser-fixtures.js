const { connectDisposable } = require("./disposable-target");
async function main() {
  const { prisma } = await connectDisposable();
  try {
    if (process.env.DATABASE_URL && process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL) throw new Error("Refusing mismatched service DATABASE_URL");
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    if (await prisma.website.findUnique({ where: { id: "m15-browser-site" } })) throw new Error("Browser fixture already exists; refusing to replace it");
    const doc = text => ({ root: { props: { title: text } }, content: [
      { type: "Heading", props: { id: "m15-heading", text, level: "h1", fontSize: 42, responsive: { mobile: { fontSize: 24 } } } },
      { type: "Text", props: { id: "m15-text", text: "Shared Puck renderer acceptance fixture", fontSize: 18 } },
    ] });
    await prisma.website.create({ data: { id: "m15-browser-site", name: "Puck fixture", slug: "m15-puck", userId: "fixture-owner", pages: { create: [
      { id: "m15-browser-home", name: "Home", slug: "home", order: 0, editorData: doc("Welcome to the Puck fixture") },
      { id: "m15-browser-about", name: "About", slug: "about", order: 1, editorData: doc("About the Puck fixture") },
    ] } } });
    await require("../src/services/website.service").publishWebsite("m15-browser-site", "fixture-owner");
    console.log("Created public browser fixture on verified disposable database");
  } finally { await prisma.$disconnect(); await require("../src/lib/prisma").$disconnect(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
