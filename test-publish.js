const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const websiteService = require('./src/services/website.service');

async function runTests() {
  console.log("Running Phase 8B Tests...");

  try {
    // 0. Setup: Create a dummy user and a dummy website to test with
    const mockUserId = "test_user_" + Date.now();
    const website = await prisma.website.create({
      data: {
        name: "Test Website",
        slug: "test-website-" + Date.now(),
        userId: mockUserId,
        theme: { color: "blue" },
        pages: {
          create: [
            {
              name: "Home",
              slug: "home",
              order: 1,
              sections: {
                create: [
                  { type: "hero", order: 1, content: { title: "Hello" } }
                ]
              }
            },
            {
              name: "About",
              slug: "about",
              order: 2,
              sections: {
                create: [
                  { type: "text", order: 1, content: { text: "About us" } }
                ]
              }
            }
          ]
        }
      }
    });

    const websiteId = website.id;
    console.log(`Created test website: ${websiteId}`);

    // TEST 1: Authenticated owner publishes a website.
    console.log("\n--- TEST 1: First Publish ---");
    const result1 = await websiteService.publishWebsite(websiteId, mockUserId);
    console.assert(result1.isPublished === true, "isPublished should be true");
    console.assert(result1.publishedAt !== null, "publishedAt should not be null");
    console.assert(result1.publishedData !== null, "publishedData should not be null");
    console.assert(result1.publishedData.pages.length === 2, "Should contain all 2 pages");
    console.assert(result1.publishedData.pages[0].sections.length === 1, "Should contain sections");
    console.log("TEST 1 PASSED!");

    // TEST 2 & 6: Publish again after modifying and saving the draft (Republishing)
    console.log("\n--- TEST 2 & 6: Republishing ---");
    // Modify draft
    await prisma.website.update({
      where: { id: websiteId },
      data: { name: "Updated Test Website" }
    });
    // Republish
    const result2 = await websiteService.publishWebsite(websiteId, mockUserId);
    console.assert(result2.publishedData.name === "Updated Test Website", "Snapshot should reflect new name");
    console.assert(result2.publishedAt > result1.publishedAt || result2.publishedAt.getTime() === result1.publishedAt.getTime(), "publishedAt updated");
    // Verify no duplicates were created
    const totalWebsites = await prisma.website.count({ where: { slug: website.slug } });
    console.assert(totalWebsites === 1, "Should not create duplicate websites");
    console.log("TEST 2 & 6 PASSED!");

    // TEST 4: User attempts to publish another user's website.
    console.log("\n--- TEST 4: Unauthorized Publish ---");
    try {
      await websiteService.publishWebsite(websiteId, "wrong_user_id");
      console.error("TEST 4 FAILED: Should have thrown an error");
    } catch (err) {
      console.assert(err.message === "Website not found or unauthorized", "Expected unauthorized error");
      console.log("TEST 4 PASSED!");
    }

    // TEST 5: Website has multiple pages.
    console.log("\n--- TEST 5: Multiple Pages in Snapshot ---");
    const snapshot = result2.publishedData;
    const pageSlugs = snapshot.pages.map(p => p.slug);
    console.assert(pageSlugs.includes("home") && pageSlugs.includes("about"), "Snapshot has all pages");
    console.log("TEST 5 PASSED!");

    // Cleanup
    await prisma.website.delete({ where: { id: websiteId } });
    console.log("\nAll service layer tests passed.");

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
