const { enabled: publicationEnabled } = require("../lib/publicationContext");
const { buildPublicationSnapshot } = require("../lib/publicationSnapshot");
const { createPageDocument, forkPageDocument } = require("../../shared/website-contract/index.cjs");
const crypto = require("crypto");
const prisma = require("../lib/prisma");

const templateInclude = {
  websiteCategory: true,
  pages: {
    orderBy: { order: "asc" },
    include: {
      sections: { orderBy: { order: "asc" } },
    },
  },
};

const websiteInclude = {
  template: true,
  pages: {
    orderBy: { order: "asc" },
    include: {
      sections: { orderBy: { order: "asc" } },
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

const httpError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const RESERVED_SLUGS = new Set([
  "admin",
  "builder",
  "templates",
  "websites",
  "categories",
  "sign-in",
  "sign-up",
  "api",
  "site",
  "sites",
  "public",
  "dashboard",
  "settings",
  "auth",
  "static",
  "assets",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "manifest.json",
  "_next",
  "undefined",
  "null",
]);

const generateShortId = (length = 6) => {
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
};

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "site";

const sanitizeSlug = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const makeUniqueWebsiteSlug = async (name, tx = prisma, currentWebsiteId = null) => {
  const base = slugify(name);
  let attempts = 0;

  while (attempts < 25) {
    const shortId = generateShortId(6);
    const slug = `${base}-${shortId}`;

    if (RESERVED_SLUGS.has(slug)) {
      attempts++;
      continue;
    }

    const existing = await tx.website.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing || (currentWebsiteId && existing.id === currentWebsiteId)) {
      return slug;
    }

    attempts++;
  }

  return `${base}-${Date.now().toString(36)}`;
};

const validateCustomSlug = async (rawSlug, currentWebsiteId = null, tx = prisma) => {
  if (typeof rawSlug !== "string" || !rawSlug.trim()) {
    throw httpError("Website slug cannot be empty", 400);
  }

  const slug = sanitizeSlug(rawSlug);

  if (!slug || slug.length < 3) {
    throw httpError("Website slug must be at least 3 characters long", 400);
  }

  if (slug.length > 60) {
    throw httpError("Website slug must be at most 60 characters long", 400);
  }

  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugPattern.test(slug)) {
    throw httpError(
      "Website slug can only contain lowercase letters, numbers, and hyphens without consecutive hyphens",
      400
    );
  }

  if (RESERVED_SLUGS.has(slug)) {
    throw httpError(
      `The slug "${slug}" is reserved for system routes. Please choose a different URL slug.`,
      400
    );
  }

  const existing = await tx.website.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (existing && (!currentWebsiteId || existing.id !== currentWebsiteId)) {
    throw httpError(
      `The slug "${slug}" is already taken by another website. Please choose another one.`,
      409
    );
  }

  return slug;
};

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);


// ============================================================
// TEMPLATE OPERATIONS
// ============================================================

const getAllTemplates = async ({ includeDrafts = false } = {}) => {
  return prisma.template.findMany({
    where: includeDrafts ? {} : { status: "PUBLISHED" },
    orderBy: { updatedAt: "desc" },
    include: { websiteCategory: true },
  });
};

const getTemplateById = async (
  id,
  { includeDrafts = false } = {}
) => {
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
    throw httpError("Template name is required");
  }

  const cleanName = name.trim();
  const baseSlug = slugify(cleanName);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  let category = "General";

  if (categoryId) {
    const categoryRecord =
      await prisma.websiteCategory.findUnique({
        where: { id: categoryId },
        select: { id: true, name: true },
      });

    if (!categoryRecord) {
      throw httpError("Category not found", 404);
    }

    category = categoryRecord.name;
  }

  return prisma.template.create({
    data: {
      name: cleanName,
      slug,
      description: description?.trim() || null,
      category,
      categoryId: categoryId || null,
      thumbnail: thumbnail?.trim() || null,
      status: "DRAFT",
      pages: {
        create: {
          name: "Home",
          slug: "home",
          order: 0,
          editorData: createPageDocument(crypto.randomUUID()),
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
  const existing = await prisma.template.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw httpError("Template not found", 404);
  }

  const data = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      throw httpError("Template name is required");
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
    if (categoryId === null || categoryId === "") {
      data.categoryId = null;
    } else {
      const categoryRecord =
        await prisma.websiteCategory.findUnique({
          where: { id: categoryId },
          select: { id: true, name: true },
        });

      if (!categoryRecord) {
        throw httpError("Category not found", 404);
      }

      data.categoryId = categoryRecord.id;
      data.category = categoryRecord.name;
    }
  }

  return prisma.template.update({
    where: { id },
    data,
    include: templateInclude,
  });
};

const assignTemplateCategory = async (
  templateId,
  categoryId
) => {
  return updateTemplate(templateId, { categoryId });
};

const setTemplateStatus = async (id, status) => {
  if (!["DRAFT", "PUBLISHED"].includes(status)) {
    throw httpError("Status must be DRAFT or PUBLISHED");
  }

  const template = await prisma.template.findUnique({
    where: { id },
    include: { pages: true },
  });

  if (!template) {
    throw httpError("Template not found", 404);
  }

  if (status === "PUBLISHED" && template.pages.length === 0) {
    throw httpError(
      "Add at least one page before publishing this template"
    );
  }

  return prisma.template.update({
    where: { id },
    data: {
      status,
      publishedAt:
        status === "PUBLISHED" ? new Date() : null,
    },
    include: templateInclude,
  });
};

const deleteTemplate = async (id) => {
  const existing = await prisma.template.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw httpError("Template not found", 404);
  }

  return prisma.template.delete({
    where: { id },
  });
};

// ============================================================
// WEBSITE CREATION AND RETRIEVAL
// ============================================================

const createWebsiteFromTemplate = async ({
  templateId,
  name,
  userId,
}) => {
  if (
    !templateId ||
    !userId ||
    typeof name !== "string" ||
    !name.trim()
  ) {
    throw httpError(
      "templateId, name, and userId are required"
    );
  }

  const template = await prisma.template.findFirst({
    where: {
      id: templateId,
      status: "PUBLISHED",
    },
    include: {
      pages: {
        orderBy: { order: "asc" },
        include: {
          sections: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!template) {
    throw httpError("Template not found", 404);
  }

  
  return prisma.$transaction(
    async (tx) => {
      const slug = await makeUniqueWebsiteSlug(
        name.trim(),
        tx
      );

      return tx.website.create({
        data: {
          name: name.trim(),
          slug,
          userId,
          templateId: template.id,
          theme: template.theme ?? undefined,

          pages: {
            create: template.pages.map((page, index) => ({
              name: page.name,
              slug:
                page.slug ||
                (index === 0 ? "home" : `page-${index + 1}`),
              order: page.order ?? index,
              responsive:
                page.responsive ??
                page.editorData?.root?.props?.responsive ??
                DEFAULT_PAGE_RESPONSIVE,
              editorData: page.editorData == null ? undefined : forkPageDocument(page.editorData, crypto.randomUUID()),

              sections: {
                create: (page.sections || []).map((section) => ({
                  type: section.type,
                  order: section.order,
                  content: section.content,
                  config: section.config ?? undefined,
                })),
              },
            })),
          },
        },
        include: websiteInclude,
      });
    },
    {
      maxWait: 10000,
      timeout: 15000,
    }
  );

};

const getWebsiteById = async (id, userId) => {
  return prisma.website.findFirst({
    where: {
      id,
      userId,
    },
    include: websiteInclude,
  });
};

const getUserWebsites = async (
  userId,
  page = 1,
  limit = 10
) => {
  const safePage = Number.isInteger(Number(page))
    ? Math.max(1, Number(page))
    : 1;

  const safeLimit = Number.isInteger(Number(limit))
    ? Math.min(50, Math.max(1, Number(limit)))
    : 10;

  const where = { userId };

  const [websites, total] = await prisma.$transaction([
    prisma.website.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      select: {
        id: true,
        name: true,
        slug: true,
        userId: true,
        templateId: true,
        createdAt: true,
        updatedAt: true,
        publishedData: true,
        ...(publicationEnabled() ? { publicationState: { select: { publishedSlug: true, activeRevisionId: true } } } : {}),
        theme: true,
        isPublished: true,
        publishedAt: true,
        pages: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            order: true,
          },
        },
      },
    }),

    prisma.website.count({ where }),
  ]);

  return {
    data: websites,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    },
  };
};

const updateWebsite = async (id, data, userId) => {
  const existing = await prisma.website.findFirst({
    where: { id, userId },
    select: { id: true, slug: true, isPublished: true, publishedData: true },
  });

  if (!existing) {
    throw httpError(
      "Website not found or unauthorized",
      404
    );
  }

  const updateData = {};

  if (data.name !== undefined) {
    if (
      typeof data.name !== "string" ||
      !data.name.trim()
    ) {
      throw httpError(
        "Website name must be a non-empty string"
      );
    }

    updateData.name = data.name.trim();
  }

  if (data.theme !== undefined) {
    if (!isPlainObject(data.theme)) {
      throw httpError("Invalid theme payload");
    }

    updateData.theme = data.theme;
  }

  if (data.slug !== undefined) {
    const validSlug = await validateCustomSlug(data.slug, id, prisma);
    updateData.slug = validSlug;

    if (!publicationEnabled() && existing.isPublished && existing.publishedData && typeof existing.publishedData === "object") {
      updateData.publishedData = {
        ...existing.publishedData,
        slug: validSlug,
      };
    }
  }

  return prisma.website.update({
    where: { id },
    data: updateData,
    include: websiteInclude,
  });
};

// ============================================================
// WEBSITE PAGE OPERATIONS
// ============================================================

const createWebsitePage = async (
  websiteId,
  { name, slug },
  userId
) => {
  const website = await prisma.website.findFirst({
    where: {
      id: websiteId,
      userId,
    },
    include: {
      pages: {
        select: { order: true },
      },
    },
  });

  if (!website) {
    throw httpError(
      "Website not found or unauthorized",
      404
    );
  }

  if (typeof name !== "string" || !name.trim()) {
    throw httpError("Page name is required");
  }

  const pageSlug = slugify(slug || name);

  return prisma.websitePage.create({
    data: {
      websiteId,
      name: name.trim(),
      slug: pageSlug,
      order:
        website.pages.reduce(
          (max, page) => Math.max(max, page.order),
          -1
        ) + 1,

      responsive: DEFAULT_PAGE_RESPONSIVE,
      editorData: createPageDocument(crypto.randomUUID(), { title: name.trim(), responsive: DEFAULT_PAGE_RESPONSIVE }),
    },
    include: {
      sections: { orderBy: { order: "asc" } },
    },
  });
};

const updateWebsitePage = async (
  pageId,
  data,
  userId
) => {
  const page = await prisma.websitePage.findFirst({
    where: {
      id: pageId,
      website: { userId },
    },
    select: { id: true },
  });

  if (!page) {
    throw httpError(
      "Website page not found or unauthorized",
      404
    );
  }

  const updateData = {};

  if (data.name !== undefined) {
    if (typeof data.name !== "string" || !data.name.trim()) {
      throw httpError("Page name is required");
    }

    updateData.name = data.name.trim();
  }

  if (data.slug !== undefined) {
    if (typeof data.slug !== "string" || !data.slug.trim()) {
      throw httpError("Page slug is required");
    }

    updateData.slug = slugify(data.slug);
  }

  return prisma.websitePage.update({
    where: { id: pageId },
    data: updateData,
    include: {
      sections: { orderBy: { order: "asc" } },
    },
  });
};

const deleteWebsitePage = async (pageId, userId) => {
  return prisma.$transaction(async (tx) => {
    const page = await tx.websitePage.findFirst({
      where: {
        id: pageId,
        website: { userId },
      },
      select: {
        id: true,
        websiteId: true,
      },
    });

    if (!page) {
      throw httpError(
        "Website page not found or unauthorized",
        404
      );
    }

    const count = await tx.websitePage.count({
      where: { websiteId: page.websiteId },
    });

    if (count <= 1) {
      throw httpError("Cannot delete the last page");
    }

    await tx.websitePage.delete({
      where: { id: pageId },
    });

    return {
      id: pageId,
      deleted: true,
    };
  });
};

const { validateEditorDocument, assertPuckEditable, assertDocumentReplacement } = require("../lib/documentValidation");

const getWebsitePageEditorData = async (websiteId, pageId, userId) => {
  const page = await prisma.websitePage.findFirst({
    where: {
      id: pageId,
      websiteId,
      website: { userId },
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
    throw httpError("Page not found in this website or unauthorized", 404);
  }

  if (!page.responsive) {
    page.responsive =
      page.editorData?.root?.props?.responsive || DEFAULT_PAGE_RESPONSIVE;
  }

  return page;
};

const saveWebsitePageEditorData = async (
  websiteId,
  pageId,
  document,
  explicitResponsive,
  userId
) => {
  validateEditorDocument(document);

  const page = await prisma.websitePage.findFirst({
    where: {
      id: pageId,
      websiteId,
      website: { userId },
    },
    select: { id: true, responsive: true, editorData: true, _count: { select: { sections: true } } },
  });

  if (!page) {
    throw httpError("Page not found in this website or unauthorized", 404);
  }

  assertPuckEditable(page);
  assertDocumentReplacement(page.editorData, document);

  const pageResponsive =
    explicitResponsive && typeof explicitResponsive === "object"
      ? explicitResponsive
      : document.root?.props?.responsive &&
        typeof document.root.props.responsive === "object"
      ? document.root.props.responsive
      : (page.responsive || DEFAULT_PAGE_RESPONSIVE);

  if (document.root && document.root.props) {
    document.root.props.responsive = pageResponsive;
  }
  validateEditorDocument(document);

  return prisma.websitePage.update({
    where: { id: pageId },
    data: {
      editorData: document,
      responsive: pageResponsive,
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

const duplicateWebsitePage = async (websiteId, pageId, userId) => {
  const source = await prisma.websitePage.findFirst({
    where: {
      id: pageId,
      websiteId,
      website: { userId },
    },
    include: {
      sections: { orderBy: { order: "asc" } },
    },
  });

  if (!source) {
    throw httpError("Page not found in this website or unauthorized", 404);
  }

  const baseSlug = slugify(`${source.slug}-copy`);
  let slug = baseSlug;
  let suffix = 2;

  while (
    await prisma.websitePage.findUnique({
      where: { websiteId_slug: { websiteId, slug } },
      select: { id: true },
    })
  ) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const lastPage = await prisma.websitePage.findFirst({
    where: { websiteId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const editorData =
    source.editorData == null
      ? undefined
      : JSON.parse(JSON.stringify(source.editorData));

  const responsive =
    source.responsive == null
      ? (editorData?.root?.props?.responsive || DEFAULT_PAGE_RESPONSIVE)
      : JSON.parse(JSON.stringify(source.responsive));

  if (editorData?.root?.props) {
    editorData.root.props.responsive = responsive;
  }
  if (editorData?.format === "vividuss.puck.page") editorData.documentId = crypto.randomUUID();
  if (editorData?.format === "vividuss.puck.page") validateEditorDocument(editorData);

  return prisma.websitePage.create({
    data: {
      websiteId,
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

const reorderWebsitePages = async (websiteId, pageIds, userId) => {
  if (
    !Array.isArray(pageIds) ||
    pageIds.some((id) => typeof id !== "string" || !id) ||
    new Set(pageIds).size !== pageIds.length
  ) {
    throw httpError("pageIds must be an array of unique page IDs", 400);
  }

  const website = await prisma.website.findFirst({
    where: { id: websiteId, userId },
    select: { id: true },
  });

  if (!website) {
    throw httpError("Website not found or unauthorized", 404);
  }

  const currentPages = await prisma.websitePage.findMany({
    where: { websiteId },
    select: { id: true },
  });

  const currentIds = new Set(currentPages.map((page) => page.id));

  if (
    currentIds.size !== pageIds.length ||
    pageIds.some((id) => !currentIds.has(id))
  ) {
    throw httpError(
      "pageIds must contain every page in this website exactly once",
      400
    );
  }

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < pageIds.length; index++) {
      await tx.websitePage.update({
        where: { id: pageIds[index] },
        data: { order: -(index + 1) },
      });
    }

    for (let index = 0; index < pageIds.length; index++) {
      await tx.websitePage.update({
        where: { id: pageIds[index] },
        data: { order: index },
      });
    }
  });

  return prisma.websitePage.findMany({
    where: { websiteId },
    orderBy: { order: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      order: true,
    },
  });
};

// ============================================================
// LEGACY SECTION OPERATIONS
// ============================================================

const updateWebsiteSection = async (
  sectionId,
  data,
  userId
) => {
  const section = await prisma.websiteSection.findFirst({
    where: {
      id: sectionId,
      page: {
        website: { userId },
      },
    },
    select: { id: true },
  });

  if (!section) {
    throw httpError(
      "Website section not found or unauthorized",
      404
    );
  }

  const updateData = {};

  if (data.type !== undefined) {
    if (typeof data.type !== "string" || !data.type.trim()) {
      throw httpError("Section type is required");
    }

    updateData.type = data.type.trim();
  }

  if (data.content !== undefined) {
    if (!isPlainObject(data.content)) {
      throw httpError("Section content must be an object");
    }

    updateData.content = data.content;
  }

  if (data.config !== undefined) {
    updateData.config = data.config;
  }

  if (data.order !== undefined) {
    if (!Number.isInteger(data.order) || data.order < 0) {
      throw httpError("Section order must be a non-negative integer");
    }

    updateData.order = data.order;
  }

  return prisma.websiteSection.update({
    where: { id: sectionId },
    data: updateData,
  });
};

const deleteWebsiteSection = async (
  sectionId,
  userId
) => {
  const section = await prisma.websiteSection.findFirst({
    where: {
      id: sectionId,
      page: {
        website: { userId },
      },
    },
    select: { id: true },
  });

  if (!section) {
    throw httpError("Website section not found", 404);
  }

  await prisma.websiteSection.delete({
    where: { id: sectionId },
  });

  return {
    id: sectionId,
    deleted: true,
  };
};

const createWebsiteSection = async (
  pageId,
  { type, content, config },
  userId
) => {
  const page = await prisma.websitePage.findFirst({
    where: {
      id: pageId,
      website: { userId },
    },
    select: { id: true },
  });

  if (!page) {
    throw httpError(
      "Website page not found or unauthorized",
      404
    );
  }

  if (typeof type !== "string" || !type.trim()) {
    throw httpError("Section type is required");
  }

  if (!isPlainObject(content)) {
    throw httpError("Section content must be an object");
  }

  const maxOrder = await prisma.websiteSection.aggregate({
    where: { pageId },
    _max: { order: true },
  });

  return prisma.websiteSection.create({
    data: {
      pageId,
      type: type.trim(),
      content,
      config: config === undefined ? undefined : config,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });
};

const reorderWebsiteSections = async ({
  pageId,
  sections,
  userId,
}) => {
  if (!Array.isArray(sections)) {
    throw httpError("Sections must be an array");
  }

  return prisma.$transaction(async (tx) => {
    const page = await tx.websitePage.findFirst({
      where: {
        id: pageId,
        website: { userId },
      },
      select: { id: true },
    });

    if (!page) {
      throw httpError(
        "Website page not found or unauthorized",
        404
      );
    }

    const existing = await tx.websiteSection.findMany({
      where: { pageId },
      select: { id: true },
    });

    const existingIds = new Set(
      existing.map((section) => section.id)
    );

    const submittedIds = new Set();

    for (let index = 0; index < sections.length; index += 1) {
      const item = sections[index];

      if (
        !item ||
        typeof item.id !== "string" ||
        !existingIds.has(item.id) ||
        submittedIds.has(item.id)
      ) {
        throw httpError("Invalid section ordering payload");
      }

      submittedIds.add(item.id);

      await tx.websiteSection.update({
        where: { id: item.id },
        data: {
          order: Number.isInteger(item.order)
            ? item.order
            : index,
        },
      });
    }

    return tx.websitePage.findUnique({
      where: { id: pageId },
      include: {
        sections: { orderBy: { order: "asc" } },
      },
    });
  });
};

// ============================================================
// DRAFT SAVING
// ============================================================

const saveWebsiteDraft = async (
  websiteId,
  pages,
  userId,
  theme,
  name
) => {
  if (!Array.isArray(pages)) {
    throw httpError("Pages must be an array");
  }

  return prisma.$transaction(async (tx) => {
    const website = await tx.website.findFirst({
      where: {
        id: websiteId,
        userId,
      },
      include: {
        pages: {
          orderBy: { order: "asc" },
          include: { sections: true },
        },
      },
    });

    if (!website) {
      throw httpError(
        "Website not found or unauthorized",
        404
      );
    }

    const currentPagesById = new Map(
      website.pages.map((page) => [page.id, page])
    );

    const idMappings = [];

    for (const incomingPage of pages) {
      if (!isPlainObject(incomingPage)) {
        throw httpError("Invalid page payload");
      }

      if (
        typeof incomingPage.id !== "string" ||
        !incomingPage.id
      ) {
        throw httpError(
          "Every existing page must include its database ID"
        );
      }

      const currentPage = currentPagesById.get(
        incomingPage.id
      );

      if (!currentPage) {
        throw httpError(
          "A submitted page does not belong to this website"
        );
      }

      const pageUpdate = {};

      if (incomingPage.name !== undefined) {
        if (
          typeof incomingPage.name !== "string" ||
          !incomingPage.name.trim()
        ) {
          throw httpError("Invalid page name");
        }

        pageUpdate.name = incomingPage.name.trim();
      }

      if (incomingPage.slug !== undefined) {
        if (
          typeof incomingPage.slug !== "string" ||
          !incomingPage.slug.trim()
        ) {
          throw httpError("Invalid page slug");
        }

        pageUpdate.slug = slugify(incomingPage.slug);
      }

      if (incomingPage.order !== undefined) {
        if (
          !Number.isInteger(incomingPage.order) ||
          incomingPage.order < 0
        ) {
          throw httpError("Invalid page order");
        }

        pageUpdate.order = incomingPage.order;
      }

      // Preserve existing Puck data unless the caller explicitly
      // submits a replacement document.
      if (incomingPage.editorData !== undefined) {
        const document = incomingPage.editorData;
        validateEditorDocument(document);
        assertPuckEditable(currentPage);
        assertDocumentReplacement(currentPage.editorData, document);

        if (
          !isPlainObject(document) ||
          !Array.isArray(document.content) ||
          !isPlainObject(document.root)
        ) {
          throw httpError("Invalid Puck document");
        }

        // Do not let a legacy-only request erase a populated document.
        const isEmptyDocument =
          document.content.length === 0 &&
          Object.keys(document.root.props || {}).length === 0;

        const existingDocument = currentPage.editorData;
        const existingHasContent =
          isPlainObject(existingDocument) &&
          Array.isArray(existingDocument.content) &&
          existingDocument.content.length > 0;

        if (isEmptyDocument && existingHasContent) {
          throw httpError(
            "Refusing to replace a populated Puck document with an empty document"
          );
        }

        pageUpdate.editorData = document;
        if (document.root?.props?.responsive) {
          pageUpdate.responsive = document.root.props.responsive;
        }
      }

      if (Object.keys(pageUpdate).length > 0) {
        await tx.websitePage.update({
          where: { id: currentPage.id },
          data: pageUpdate,
        });
      }

      // The legacy builder can continue submitting sections while
      // the Puck editor stores editorData separately.
      if (incomingPage.sections !== undefined) {
        if (!Array.isArray(incomingPage.sections)) {
          throw httpError("Sections must be an array");
        }

        const existingSections = currentPage.sections;
        const existingIds = new Set(
          existingSections.map((section) => section.id)
        );

        const retainedDatabaseIds = new Set();

        for (
          let index = 0;
          index < incomingPage.sections.length;
          index += 1
        ) {
          const incomingSection =
            incomingPage.sections[index];

          if (
            !isPlainObject(incomingSection) ||
            typeof incomingSection.type !== "string" ||
            !incomingSection.type.trim() ||
            !isPlainObject(incomingSection.content)
          ) {
            throw httpError("Invalid section payload");
          }

          const requestedId =
            typeof incomingSection.id === "string"
              ? incomingSection.id
              : null;

          const order = Number.isInteger(incomingSection.order)
            ? incomingSection.order
            : index;

          const sectionData = {
            type: incomingSection.type.trim(),
            order,
            content: incomingSection.content,
            config:
              incomingSection.config === undefined
                ? undefined
                : incomingSection.config,
          };

          if (
            requestedId &&
            existingIds.has(requestedId)
          ) {
            await tx.websiteSection.update({
              where: { id: requestedId },
              data: sectionData,
            });

            retainedDatabaseIds.add(requestedId);
          } else {
            const created = await tx.websiteSection.create({
              data: {
                ...sectionData,
                pageId: currentPage.id,
              },
            });

            retainedDatabaseIds.add(created.id);

            if (requestedId) {
              idMappings.push({
                clientId: requestedId,
                databaseId: created.id,
              });
            }
          }
        }

        const removedIds = existingSections
          .filter(
            (section) =>
              !retainedDatabaseIds.has(section.id)
          )
          .map((section) => section.id);

        if (removedIds.length > 0) {
          await tx.websiteSection.deleteMany({
            where: {
              pageId: currentPage.id,
              id: { in: removedIds },
            },
          });
        }
      }
    }

    const websiteUpdate = {};

    if (theme !== undefined) {
      if (!isPlainObject(theme)) {
        throw httpError("Invalid theme payload");
      }

      websiteUpdate.theme = theme;
    }

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        throw httpError("Website name is required");
      }

      websiteUpdate.name = name.trim();
    }

    const updated = await tx.website.update({
      where: { id: websiteId },
      data: websiteUpdate,
      select: {
        id: true,
        updatedAt: true,
        publishedData: true,
      },
    });

    return {
      ...updated,
      idMappings,
    };
  });
};

// ============================================================
// PUBLISHING
// ============================================================

const publishWebsite = async (websiteId, userId, customSlug = null) => {
  return prisma.$transaction(async (tx) => {
    const website = await tx.website.findFirst({
      where: {
        id: websiteId,
        userId,
      },
      include: {
        pages: {
          orderBy: { order: "asc" },
          include: {
            sections: { orderBy: { order: "asc" } },
          },
        },
      },
    });

    if (!website) {
      throw httpError(
        "Website not found or unauthorized",
        404
      );
    }

    if (website.pages.length === 0) {
      throw httpError(
        "Cannot publish a website without pages"
      );
    }

    // Determine production-ready slug
    let finalSlug = website.slug;
    if (customSlug && typeof customSlug === "string" && customSlug.trim()) {
      finalSlug = await validateCustomSlug(customSlug, website.id, tx);
    } else {
      // Ensure slug is clean, collision-free, non-reserved, and has a unique slug-id
      const isReserved = RESERVED_SLUGS.has(finalSlug);
      const isPlainGeneric = !finalSlug || finalSlug === "website-name" || finalSlug === "template" || finalSlug === "site";
      
      if (isReserved || isPlainGeneric) {
        finalSlug = await makeUniqueWebsiteSlug(website.name || "site", tx, website.id);
      }
    }

    for (const page of website.pages) {
      if (page.editorData != null) validateEditorDocument(page.editorData);
    }
    const publishedData = buildPublicationSnapshot(website, finalSlug);

    return tx.website.update({
      where: { id: website.id },
      data: {
        slug: finalSlug,
        isPublished: true,
        publishedAt: new Date(),
        publishedData,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        isPublished: true,
        publishedAt: true,
        updatedAt: true,
        publishedData: true,
      },
    });
  });
};

const getPublishedWebsiteBySlug = async (slug) => {
  if (!slug || typeof slug !== "string") return null;
  const cleanSlug = slug.toLowerCase().trim();

  return prisma.website.findFirst({
    where: {
      slug: {
        equals: cleanSlug,
        mode: "insensitive",
      },
      isPublished: true,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      theme: true,
      isPublished: true,
      publishedAt: true,
      publishedData: true,
    },
  });
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  RESERVED_SLUGS,
  makeUniqueWebsiteSlug,
  validateCustomSlug,
  // Template operations
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  assignTemplateCategory,
  setTemplateStatus,
  deleteTemplate,

  // Website operations
  createWebsiteFromTemplate,
  createWebsitePage,
  updateWebsitePage,
  deleteWebsitePage,
  getWebsiteById,
  getUserWebsites,
  updateWebsite,
  updateWebsiteSection,
  deleteWebsiteSection,
  createWebsiteSection,
  reorderWebsiteSections,
  saveWebsiteDraft,
  publishWebsite,
  getPublishedWebsiteBySlug,
  getWebsitePageEditorData,
  saveWebsitePageEditorData,
  duplicateWebsitePage,
  reorderWebsitePages,
};

module.exports = require("./publicationAdapter").attachPublicationIntegrity(module.exports);
