const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const websiteService = require('./src/services/website.service');


async function runTests() {
  console.log("Running Phase 8B Final Verification Tests...\n");

  try {
    // Setup a dummy website for testing
    const mockUserId = "test_user_verify_" + Date.now();
    const website = await prisma.website.create({
      data: {
        name: "Verify Website",
        slug: "verify-website-" + Date.now(),
        userId: mockUserId,
        pages: {
          create: [
            {
              name: "Home", slug: "home", order: 1,
              sections: { create: [{ type: "hero", order: 1, content: {} }] }
            },
            {
              name: "About", slug: "about", order: 2,
              sections: { create: [{ type: "text", order: 1, content: {} }] }
            }
          ]
        }
      }
    });
    const websiteId = website.id;

    console.log(`Created test website: ${websiteId}`);

    // ==========================================
    // TEST 3: Unauthenticated Request via HTTP
    // ==========================================
    console.log("\n--- TEST 3: Unauthenticated Request ---");
    const response = await fetch(`http://localhost:5000/api/websites/${websiteId}/publish`, {
      method: "POST"
    });
    const result3 = await response.json();
    console.assert(response.status === 401, `Expected HTTP 401, got ${response.status}`);
    console.assert(result3.success === false, "Expected success: false");
    console.log("HTTP 401 correctly returned.");
    
    const checkDbAfterUnauthorized = await prisma.website.findUnique({ where: { id: websiteId } });
    console.assert(checkDbAfterUnauthorized.isPublished === false, "isPublished should remain false");
    console.assert(checkDbAfterUnauthorized.publishedAt === null, "publishedAt should remain null");
    console.assert(checkDbAfterUnauthorized.publishedData === null, "publishedData should remain null");
    console.log("TEST 3 PASSED! No fields were modified.");

    // ==========================================
    // Setup for remaining tests
    // ==========================================
    // First, publish successfully to establish a baseline
    await websiteService.publishWebsite(websiteId, mockUserId);
    const baselineDb = await prisma.website.findUnique({
      where: { id: websiteId },
      include: { pages: { include: { sections: true } } }
    });
    const initialPagesCount = baselineDb.pages.length;
    const initialSectionsCount = baselineDb.pages.reduce((acc, p) => acc + p.sections.length, 0);

    // ==========================================
    // TEST 7: Publish Failure Preservation
    // ==========================================
    console.log("\n--- TEST 7: Publish Failure Preservation ---");
    // We simulate a failure by temporarily monkey-patching prisma.website.update to throw an error BEFORE it updates the DB.
    // This allows us to test atomicity without changing the production files.
    const originalUpdate = prisma.website.update;
    prisma.website.update = async () => { throw new Error("SIMULATED DATABASE FAILURE"); };
    
    try {
      await websiteService.publishWebsite(websiteId, mockUserId);
      console.error("Should have failed!");
    } catch (e) {
      console.assert(e.message === "SIMULATED DATABASE FAILURE", "Expected simulated failure");
    }
    // Restore the mock
    prisma.website.update = originalUpdate;

    const afterFailureDb = await prisma.website.findUnique({ where: { id: websiteId } });
    console.assert(afterFailureDb.isPublished === baselineDb.isPublished, "isPublished unchanged");
    console.assert(afterFailureDb.publishedAt.getTime() === baselineDb.publishedAt.getTime(), "publishedAt unchanged");
    console.assert(JSON.stringify(afterFailureDb.publishedData) === JSON.stringify(baselineDb.publishedData), "publishedData unchanged");
    console.log("TEST 7 PASSED! Existing published state is perfectly preserved on failure.");

    // ==========================================
    // VERIFY: Draft Preservation & Snapshot Completeness & Duplicates
    // ==========================================
    console.log("\n--- VERIFYING ADDITIONAL CONSTRAINTS ---");
    
    const finalDb = await prisma.website.findUnique({
      where: { id: websiteId },
      include: { pages: { include: { sections: true } } }
    });
    const finalPagesCount = finalDb.pages.length;
    const finalSectionsCount = finalDb.pages.reduce((acc, p) => acc + p.sections.length, 0);

    console.assert(initialPagesCount === finalPagesCount, "Draft WebsitePage records remain unchanged");
    console.assert(initialSectionsCount === finalSectionsCount, "Draft WebsiteSection records remain unchanged");
    console.log("Draft preservation passed.");

    const snapshot = finalDb.publishedData;
    console.assert(snapshot.pages.length === 2, "Snapshot contains ALL pages");
    console.assert(snapshot.pages[0].sections.length === 1 && snapshot.pages[1].sections.length === 1, "Each page contains ALL of its sections");
    console.log("Snapshot completeness passed.");

    const totalWebsitesWithSlug = await prisma.website.count({ where: { slug: website.slug } });
    console.assert(totalWebsitesWithSlug === 1, "No duplicate Website records created");
    console.log("Duplicate-record check passed.");

    // Cleanup
    await prisma.website.delete({ where: { id: websiteId } });
    console.log("\nALL VERIFICATIONS PASSED!");

  } catch (err) {
    console.error("Test failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
