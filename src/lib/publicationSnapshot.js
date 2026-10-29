// Pure snapshot construction. Persistence/authorization remain in website.service.
// This is the existing replaceable publication JSON, not immutable revision storage.
function buildPublicationSnapshot(website, slug) {
  return JSON.parse(JSON.stringify({
    format: "vividuss.website.snapshot", schemaVersion: 1, registryVersion: 1,
    websiteId: website.id, name: website.name, slug, theme: website.theme ?? null,
    pages: website.pages.map(page => ({
      id: page.id, name: page.name, slug: page.slug, order: page.order,
      editorData: page.editorData ?? null, responsive: page.responsive ?? null,
      sections: (page.sections || []).map(section => ({
        id: section.id, type: section.type, order: section.order,
        content: section.content, config: section.config ?? null,
      })),
    })),
  }));
}
module.exports = { buildPublicationSnapshot };
