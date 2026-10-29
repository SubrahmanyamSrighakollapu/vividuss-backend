const prisma = require("../lib/prisma");
const publication = require("./publication.service");
const { enabled, transactions, tokens, fail } = require("../lib/publicationContext");
const { validateLayout } = require("../lib/revisionSnapshot");
function attachPublicationIntegrity(legacy) {
  const result = { ...legacy };
  const mutations = {
    updateWebsite: a => [{ websiteId: a[0] }, a[2]],
    createWebsitePage: a => [{ websiteId: a[0] }, a[2]],
    updateWebsitePage: a => [{ pageId: a[0] }, a[2]],
    deleteWebsitePage: a => [{ pageId: a[0] }, a[1]],
    saveWebsitePageEditorData: a => [{ websiteId: a[0] }, a[4]],
    duplicateWebsitePage: a => [{ websiteId: a[0] }, a[2]],
    reorderWebsitePages: a => [{ websiteId: a[0] }, a[2]],
    updateWebsiteSection: a => [{ sectionId: a[0] }, a[2]],
    deleteWebsiteSection: a => [{ sectionId: a[0] }, a[1]],
    createWebsiteSection: a => [{ pageId: a[0] }, a[2]],
    reorderWebsiteSections: a => [{ pageId: a[0].pageId }, a[0].userId],
    saveWebsiteDraft: a => [{ websiteId: a[0] }, a[2]],
  };
  for (const [name, locate] of Object.entries(mutations)) {
    result[name] = (...args) => {
      if (!enabled()) return legacy[name](...args);
      const [locator, userId] = locate(args);
      return publication.mutate(locator, userId, async () => {
        if (name === "updateWebsite" && args[1]?.slug !== undefined) {
          const website = await prisma.website.findUnique({where:{id:locator.websiteId}});
          const state = await prisma.websitePublicationState.findUnique({where:{websiteId:locator.websiteId}});
          if (website.isPublished && !state.activeRevisionId && args[1].slug !== website.slug) throw fail("Publish once to establish revision history before changing this legacy website URL. Existing live output is preserved.",409,"LEGACY_PUBLISH_REQUIRED");
        }
        return legacy[name](...args);
      });
    };
  }
  result.getWebsiteById = (id, userId) => enabled()
    ? publication.readDraft(id, userId, () => legacy.getWebsiteById(id, userId)) : legacy.getWebsiteById(id, userId);
  result.getWebsitePageEditorData = (id, pageId, userId) => enabled()
    ? publication.readDraft(id, userId, () => legacy.getWebsitePageEditorData(id, pageId, userId)) : legacy.getWebsitePageEditorData(id, pageId, userId);
  result.publishWebsite = (id, userId, customSlug) => enabled()
    ? publication.publish(id, userId, { customSlug, validateSlug: legacy.validateCustomSlug }) : legacy.publishWebsite(id, userId, customSlug);
  result.getPublishedWebsiteBySlug = slug => publication.publicWebsite(slug, legacy.getPublishedWebsiteBySlug);
  result.createWebsiteFromTemplate = (...args) => {
    if (!enabled()) return legacy.createWebsiteFromTemplate(...args);
    return prisma.$transaction(async tx => transactions.run(tx, async () => {
      const website = await legacy.createWebsiteFromTemplate(...args);
      const layout = website.template?.globalLayout ?? null;
      validateLayout(layout);
      const state = await tx.websitePublicationState.create({ data: { websiteId: website.id,
        ...(layout === null ? {} : { globalLayout: layout }) } });
      return { ...website, concurrency: tokens(state) };
    }));
  };
  return result;
}
module.exports = { attachPublicationIntegrity };
