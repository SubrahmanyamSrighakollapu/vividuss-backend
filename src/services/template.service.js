const { createPageDocument } = require("../../shared/website-contract/index.cjs");
const crypto = require("node:crypto");
const { withLayoutDefaults } = require("../lib/globalLayout");

const prisma = require("../lib/prisma");

const templateInclude = {
  websiteCategory: true,
  pages: {
    orderBy: { order: "asc" },
    include: {
      sections: {
        orderBy: { order: "asc" },
      },
    },
  },
};

const DEFAULT_PAGE_RESPONSIVE = {
  desktop: {
    maxWidth: "1280px",
    paddingX: "24px",
    paddingY: "40px",
    baseFontSize: "16px",
  },
  tablet: {
    maxWidth: "768px",
    paddingX: "20px",
    paddingY: "32px",
    baseFontSize: "15px",
  },
  mobile: {
    maxWidth: "100%",
    paddingX: "16px",
    paddingY: "24px",
    baseFontSize: "14px",
  },
};

const getAllTemplates = async ({ includeDrafts = false } = {}) => {
  return prisma.template.findMany({
    where: includeDrafts ? {} : { status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    include: { websiteCategory: true },
  });
};

const getTemplateById = async (id, { includeDrafts = false } = {}) => {
  return prisma.template.findFirst({
    where: {
      id,
      ...(includeDrafts ? {} : { status: "PUBLISHED" }),
    },
    include: templateInclude,
  });
};

const createTemplate = async ({
  name,
  description,
  categoryId,
  thumbnail,
}) => {
  if (typeof name !== "string" || !name.trim()) {
    const error = new Error("Template name is required");
    error.statusCode = 400;
    throw error;
  }

  let categoryName = "General";

  if (categoryId) {
    const category = await prisma.websiteCategory.findUnique({
      where: { id: categoryId },
      select: { id: true, name: true },
    });

    if (!category) {
      const error = new Error("Category not found");
      error.statusCode = 404;
      throw error;
    }

    categoryName = category.name;
  }

  const slugBase =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "template";

  return prisma.template.create({
    data: {
      name: name.trim(),
      slug: `${slugBase}-${Date.now().toString(36)}`,
      description: description?.trim() || null,
      category: categoryName,
      categoryId: categoryId || null,
      thumbnail: thumbnail?.trim() || null,
      status: "DRAFT",
      pages: {
        create: {
          name: "Home",
          slug: "home",
          order: 0,
          responsive: DEFAULT_PAGE_RESPONSIVE,
          editorData: createPageDocument(crypto.randomUUID(), { title: "Home", responsive: DEFAULT_PAGE_RESPONSIVE }),
        },
      },
    },
    include: templateInclude,
  });
};

const updateTemplate = async (
  id,
  { name, description, categoryId, thumbnail }
) => {
  const data = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      const error = new Error("Template name is required");
      error.statusCode = 400;
      throw error;
    }
    data.name = name.trim();
  }

  if (description !== undefined) {
    data.description = description?.trim() || null;
  }

  if (thumbnail !== undefined) {
    data.thumbnail = thumbnail?.trim() || null;
  }

  if (categoryId !== undefined) {
    if (!categoryId) {
      data.categoryId = null;
      data.category = "General";
    } else {
      const category = await prisma.websiteCategory.findUnique({
        where: { id: categoryId },
        select: { id: true, name: true },
      });

      if (!category) {
        const error = new Error("Category not found");
        error.statusCode = 404;
        throw error;
      }

      data.categoryId = category.id;
      data.category = category.name;
    }
  }

  return prisma.template.update({
    where: { id },
    data,
    include: templateInclude,
  });
};

const assignTemplateCategory = async (templateId, categoryId) => {
  return updateTemplate(templateId, { categoryId });
};

const setTemplateStatus = async (id, status) => {
  if (!["DRAFT", "PUBLISHED"].includes(status)) {
    const error = new Error("Status must be DRAFT or PUBLISHED");
    error.statusCode = 400;
    throw error;
  }

  const template = await prisma.template.findUnique({
    where: { id },
    include: { pages: true },
  });

  if (!template) {
    const error = new Error("Template not found");
    error.statusCode = 404;
    throw error;
  }

  if (status === "PUBLISHED" && template.pages.length === 0) {
    const error = new Error("Add at least one page before publishing");
    error.statusCode = 400;
    throw error;
  }

  if (status === "PUBLISHED") for (const page of template.pages) {
    if (page.editorData != null) validateEditorDocument(page.editorData);
  }

  return prisma.template.update({
    where: { id },
    data: {
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
    },
    include: templateInclude,
  });
};

const deleteTemplate = async (id) => {
  return prisma.template.delete({
    where: { id },
  });
};




const createSection = async (templateId, pageId, { type, content, config }) => {
  if (typeof type !== "string" || !type.trim()) {
    const error = new Error("Section type is required");
    error.statusCode = 400;
    throw error;
  }

  const page = await prisma.templatePage.findFirst({
    where: { id: pageId, templateId },
    select: { id: true },
  });

  if (!page) {
    const error = new Error("Page not found in this template");
    error.statusCode = 404;
    throw error;
  }

  const lastSection = await prisma.templateSection.findFirst({
    where: { pageId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  return prisma.templateSection.create({
    data: {
      type: type.trim(),
      order: (lastSection?.order ?? -1) + 1,
      content: content ?? {},
      config: config ?? undefined,
      pageId,
    },
  });
};

const updateSection = async (sectionId, { type, content, config }) => {
  const existing = await prisma.templateSection.findUnique({
    where: { id: sectionId },
    select: { id: true },
  });

  if (!existing) {
    const error = new Error("Section not found");
    error.statusCode = 404;
    throw error;
  }

  const data = {};

  if (type !== undefined) {
    if (typeof type !== "string" || !type.trim()) {
      const error = new Error("Section type must be a non-empty string");
      error.statusCode = 400;
      throw error;
    }
    data.type = type.trim();
  }

  if (content !== undefined) data.content = content;
  if (config !== undefined) data.config = config;

  return prisma.templateSection.update({
    where: { id: sectionId },
    data,
  });
};

const deleteSection = async (sectionId) => {
  return prisma.templateSection.delete({
    where: { id: sectionId },
  });
};

const reorderSections = async (templateId, pageId, sectionIds) => {
  if (
    !Array.isArray(sectionIds) ||
    sectionIds.some((id) => typeof id !== "string" || !id) ||
    new Set(sectionIds).size !== sectionIds.length
  ) {
    const error = new Error(
      "sectionIds must be an array of unique section IDs"
    );
    error.statusCode = 400;
    throw error;
  }

  const page = await prisma.templatePage.findFirst({
    where: { id: pageId, templateId },
    select: { id: true },
  });

  if (!page) {
    const error = new Error("Page not found in this template");
    error.statusCode = 404;
    throw error;
  }

  const currentSections = await prisma.templateSection.findMany({
    where: { pageId },
    select: { id: true },
  });

  const currentIds = new Set(currentSections.map((section) => section.id));

  // Require the complete list so a partial reorder cannot lose sections.
  if (
    currentIds.size !== sectionIds.length ||
    sectionIds.some((id) => !currentIds.has(id))
  ) {
    const error = new Error(
      "sectionIds must contain every section on this page exactly once"
    );
    error.statusCode = 400;
    throw error;
  }

  await prisma.$transaction(
    sectionIds.map((id, index) =>
      prisma.templateSection.update({
        where: { id },
        data: { order: index },
      })
    )
  );

  return prisma.templateSection.findMany({
    where: { pageId },
    orderBy: { order: "asc" },
  });
};



const { validateEditorDocument, assertPuckEditable, assertDocumentReplacement } = require("../lib/documentValidation");

const getPageEditorData = async (templateId, pageId) => {
  const page = await prisma.templatePage.findFirst({
    where: {
      id: pageId,
      templateId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      order: true,
      responsive: true,
      editorData: true,
      sections: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!page) {
    const error = new Error("Page not found in this template");
    error.statusCode = 404;
    throw error;
  }

  // Ensure responsive object is initialized if not set
  if (!page.responsive) {
    page.responsive =
      page.editorData?.root?.props?.responsive || DEFAULT_PAGE_RESPONSIVE;
  }

  return page;
};

const savePageEditorData = async (templateId, pageId, document, explicitResponsive) => {
  validateEditorDocument(document);

  const page = await prisma.templatePage.findFirst({
    where: {
      id: pageId,
      templateId,
    },
    select: { id: true, responsive: true, editorData: true, _count: { select: { sections: true } } },
  });

  if (!page) {
    const error = new Error("Page not found in this template");
    error.statusCode = 404;
    throw error;
  }

  // Extract page-level responsive settings from explicit argument or document root
  assertPuckEditable(page);
  assertDocumentReplacement(page.editorData, document);

  const pageResponsive =
    explicitResponsive && typeof explicitResponsive === "object"
      ? explicitResponsive
      : document.root?.props?.responsive &&
        typeof document.root.props.responsive === "object"
      ? document.root.props.responsive
      : (page.responsive || DEFAULT_PAGE_RESPONSIVE);

  // Synchronize document root props
  if (document.root && document.root.props) {
    document.root.props.responsive = pageResponsive;
  }
  validateEditorDocument(document);

  return prisma.templatePage.update({
    where: { id: pageId },
    data: {
      editorData: document,
      responsive: pageResponsive,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      responsive: true,
      editorData: true,
    },
  });
};

const makePageSlug = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "page";

const pageError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// Create a page with a valid, empty Puck document and dedicated responsive configuration.
const createPage = async (templateId, { name, slug, responsive }) => {
  if (typeof name !== "string" || !name.trim()) {
    throw pageError("Page name is required", 400);
  }

  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { id: true },
  });

  if (!template) throw pageError("Template not found", 404);

  const pageName = name.trim();
  const pageSlug = makePageSlug(
    typeof slug === "string" && slug.trim() ? slug : pageName
  );

  const existingSlug = await prisma.templatePage.findUnique({
    where: {
      templateId_slug: { templateId, slug: pageSlug },
    },
    select: { id: true },
  });

  if (existingSlug) {
    throw pageError("A page with this URL slug already exists", 409);
  }

  const lastPage = await prisma.templatePage.findFirst({
    where: { templateId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const pageResponsive =
    responsive && typeof responsive === "object"
      ? responsive
      : DEFAULT_PAGE_RESPONSIVE;
  const pageDocument = createPageDocument(crypto.randomUUID(), { title: pageName, responsive: pageResponsive });
  validateEditorDocument(pageDocument);

  return prisma.templatePage.create({
    data: {
      templateId,
      name: pageName,
      slug: pageSlug,
      order: (lastPage?.order ?? -1) + 1,
      responsive: pageResponsive,
      editorData: pageDocument,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      order: true,
      responsive: true,
      editorData: true,
    },
  });
};

// Rename a page and optionally change its URL slug.
const renamePage = async (templateId, pageId, { name, slug }) => {
  const data = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw pageError("Page name is required", 400);
    }
    data.name = name.trim();
  }

  if (slug !== undefined) {
    if (typeof slug !== "string" || !slug.trim()) {
      throw pageError("Page slug is required", 400);
    }
    data.slug = makePageSlug(slug);
  } else if (name !== undefined) {
    data.slug = makePageSlug(name);
  }

  if (!Object.keys(data).length) {
    throw pageError("Provide a page name or slug to update", 400);
  }

  const existing = await prisma.templatePage.findFirst({
    where: { id: pageId, templateId },
    select: { id: true },
  });

  if (!existing) throw pageError("Page not found in this template", 404);

  if (data.slug) {
    const conflict = await prisma.templatePage.findFirst({
      where: {
        templateId,
        slug: data.slug,
        NOT: { id: pageId },
      },
      select: { id: true },
    });

    if (conflict) {
      throw pageError("A page with this URL slug already exists", 409);
    }
  }

  return prisma.templatePage.update({
    where: { id: pageId },
    data,
    select: { id: true, name: true, slug: true, order: true },
  });
};

// Duplicate the page document and its legacy section records.
const duplicatePage = async (templateId, pageId) => {
  const source = await prisma.templatePage.findFirst({
    where: { id: pageId, templateId },
    include: {
      sections: { orderBy: { order: "asc" } },
    },
  });

  if (!source) throw pageError("Page not found in this template", 404);

  const baseSlug = makePageSlug(`${source.slug}-copy`);
  let slug = baseSlug;
  let suffix = 2;

  while (
    await prisma.templatePage.findUnique({
      where: { templateId_slug: { templateId, slug } },
      select: { id: true },
    })
  ) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const lastPage = await prisma.templatePage.findFirst({
    where: { templateId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  // JSON round-trip creates a detached copy of JSON-compatible data.
  const editorData = source.editorData == null
    ? undefined
    : JSON.parse(JSON.stringify(source.editorData));

  const responsive = source.responsive == null
    ? (editorData?.root?.props?.responsive || DEFAULT_PAGE_RESPONSIVE)
    : JSON.parse(JSON.stringify(source.responsive));

  if (editorData?.root?.props) {
    editorData.root.props.responsive = responsive;
  }
  if (editorData?.format === "vividuss.puck.page") editorData.documentId = crypto.randomUUID();
  if (editorData?.format === "vividuss.puck.page") validateEditorDocument(editorData);

  return prisma.templatePage.create({
    data: {
      templateId,
      name: `${source.name} (Copy)`,
      slug,
      order: (lastPage?.order ?? -1) + 1,
      responsive,
      ...(editorData !== undefined ? { editorData } : {}),
      sections: {
        create: source.sections.map((section) => ({
          type: section.type,
          order: section.order,
          content: section.content,
          ...(section.config != null ? { config: section.config } : {}),
        })),
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      order: true,
      responsive: true,
      editorData: true,
    },
  });
};

// Delete a page but never leave a template with zero pages.
const deletePage = async (templateId, pageId) => {
  return prisma.$transaction(async (tx) => {
    const page = await tx.templatePage.findFirst({
      where: { id: pageId, templateId },
      select: { id: true },
    });

    if (!page) throw pageError("Page not found in this template", 404);

    const pageCount = await tx.templatePage.count({
      where: { templateId },
    });

    if (pageCount <= 1) {
      throw pageError("Cannot delete the last page of a template", 400);
    }

    await tx.templatePage.delete({
      where: { id: pageId },
    });

    return { id: pageId };
  });
};

// Reorder all pages using their IDs in the desired order.
const reorderPages = async (templateId, pageIds) => {
  if (
    !Array.isArray(pageIds) ||
    pageIds.some((id) => typeof id !== "string" || !id) ||
    new Set(pageIds).size !== pageIds.length
  ) {
    throw pageError("pageIds must be an array of unique page IDs", 400);
  }

  const currentPages = await prisma.templatePage.findMany({
    where: { templateId },
    select: { id: true },
  });

  const currentIds = new Set(currentPages.map((page) => page.id));

  if (
    currentIds.size !== pageIds.length ||
    pageIds.some((id) => !currentIds.has(id))
  ) {
    throw pageError(
      "pageIds must contain every page in this template exactly once",
      400
    );
  }

  // Temporary unique order values avoid collisions during reordering.
  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < pageIds.length; index++) {
      await tx.templatePage.update({
        where: { id: pageIds[index] },
        data: { order: -(index + 1) },
      });
    }

    for (let index = 0; index < pageIds.length; index++) {
      await tx.templatePage.update({
        where: { id: pageIds[index] },
        data: { order: index },
      });
    }
  });

  return prisma.templatePage.findMany({
    where: { templateId },
    orderBy: { order: "asc" },
    select: { id: true, name: true, slug: true, order: true },
  });
};





const getGlobalLayout = async (templateId) => {
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      globalLayout: true,
    },
  });

  if (!template) {
    const error = new Error("Template not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    templateId: template.id,
    globalLayout: withLayoutDefaults(template.globalLayout),
  };
};

const saveGlobalLayout = async (templateId, globalLayout) => {
  if (
    !globalLayout ||
    typeof globalLayout !== "object" ||
    Array.isArray(globalLayout)
  ) {
    const error = new Error("globalLayout must be an object");
    error.statusCode = 400;
    throw error;
  }

  if (
    !globalLayout.header ||
    typeof globalLayout.header !== "object" ||
    Array.isArray(globalLayout.header) ||
    !globalLayout.footer ||
    typeof globalLayout.footer !== "object" ||
    Array.isArray(globalLayout.footer)
  ) {
    const error = new Error(
      "globalLayout must contain header and footer objects"
    );
    error.statusCode = 400;
    throw error;
  }

  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { id: true },
  });

  if (!template) {
    const error = new Error("Template not found");
    error.statusCode = 404;
    throw error;
  }

  return prisma.template.update({
    where: { id: templateId },
    data: { globalLayout },
    select: {
      id: true,
      globalLayout: true,
    },
  });
};




const getAdminGlobalLayout = async (req, res) => {
  try {
    const data = await templateService.getGlobalLayout(req.params.id);

    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    return handleError(res, error, "Failed to load global layout");
  }
};

const updateAdminGlobalLayout = async (req, res) => {
  try {
    const data = await templateService.saveGlobalLayout(
      req.params.id,
      req.body?.globalLayout
    );

    return res.json({
      success: true,
      message: "Global layout saved successfully",
      data,
    });
  } catch (error) {
    return handleError(res, error, "Failed to save global layout");
  }
};




module.exports = {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  assignTemplateCategory,
  setTemplateStatus,
  deleteTemplate,
  createSection,
  updateSection,
  deleteSection,
  reorderSections,
  getPageEditorData,
  savePageEditorData,
  createPage,
  renamePage,
  duplicatePage,
  deletePage,
  reorderPages,
  getGlobalLayout,
saveGlobalLayout,
getAdminGlobalLayout,
updateAdminGlobalLayout,
};
