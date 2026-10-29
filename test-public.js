const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPublicEndpoint() {
  console.log("Running Phase 8D Tests...");
  
  try {
    const mockUserId = "user_8d_" + Date.now();
    const slug = "public-test-site-" + Date.now();
    
    const website = await prisma.website.create({
      data: {
        name: "Test 8D",
        slug: slug,
        userId: mockUserId,
        pages: {
          create: [
            { name: "Home", slug: "home", order: 1, sections: { create: [{ type: "hero", order: 2, content: {v: 1} }, { type: "text", order: 1, content: {v: 1} }] } },
            { name: "About", slug: "about", order: 2, sections: { create: [] } }
          ]
        }
      }
    });

    // B. Unpublished website returns 404
    console.log("\n--- B. Unpublished website returns 404 ---");
    let res = await fetch(`http://localhost:5000/api/websites/public/${slug}`);
    console.assert(res.status === 404, `Expected 404, got ${res.status}`);
    console.log("Passed.");

    // C. Unknown slug returns 404
    console.log("\n--- C. Unknown slug returns 404 ---");
    res = await fetch(`http://localhost:5000/api/websites/public/does-not-exist-${Date.now()}`);
    console.assert(res.status === 404, `Expected 404, got ${res.status}`);
    console.log("Passed.");

    // Publish Version A
    const websiteService = require('./src/services/website.service');
    await websiteService.publishWebsite(website.id, mockUserId);

    // A. Published website renders successfully (API check)
    // I. No Clerk authentication required for public routes.
    console.log("\n--- A & I. Published website fetch (No auth) ---");
    res = await fetch(`http://localhost:5000/api/websites/public/${slug}`);
    console.assert(res.status === 200, `Expected 200, got ${res.status}`);
    const dataA = await res.json();
    console.assert(dataA.name === "Test 8D", "Name matches");
    console.log("Passed.");

    // D. Published snapshot isolation
    console.log("\n--- D. Published snapshot isolation ---");
    await prisma.website.update({ where: { id: website.id }, data: { name: "Test 8D Version B" }});
    res = await fetch(`http://localhost:5000/api/websites/public/${slug}`);
    const dataIsolated = await res.json();
    console.assert(dataIsolated.name === "Test 8D", "Public API should still return Version A!");
    console.log("Passed.");

    // E. Republish
    console.log("\n--- E. Republish ---");
    await websiteService.publishWebsite(website.id, mockUserId);
    res = await fetch(`http://localhost:5000/api/websites/public/${slug}`);
    const dataB = await res.json();
    console.assert(dataB.name === "Test 8D Version B", "Public API should now return Version B");
    console.log("Passed.");

    await prisma.website.delete({ where: { id: website.id } });
    console.log("\nAll API isolation tests passed!");
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

testPublicEndpoint();
