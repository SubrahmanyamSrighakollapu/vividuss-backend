const websiteService = require("../services/website.service");
const { getAuth } = require("@clerk/express");

// Create website from template
// Create website from template
const createWebsite = async (req, res) => {
  try {
    const { getAuth } = require("@clerk/express");

const authState = getAuth(req);

console.log("Backend Clerk diagnostic:", {
  hasUserId: Boolean(authState.userId),
  hasAuthorizationHeader: Boolean(req.headers.authorization),
  authorizationScheme: req.headers.authorization
    ? req.headers.authorization.split(" ")[0]
    : null,
});

if (!authState.userId) {
  return res.status(401).json({
    success: false,
    message: "Authentication required",
  });
}

    const { templateId, name } = req.body;

    if (!templateId || !name) {
      return res.status(400).json({
        success: false,
        message: "templateId and name are required",
      });
    }

    const website = await websiteService.createWebsiteFromTemplate({
      templateId,
      name,
      userId: authState.userId,
    });

    res.status(201).json({
      success: true,
      data: website,
    });

  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error("Create website error:", error);

    if (error.message === "Template not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      ...(error.details ? { code: error.code, errors: error.details } : {}),
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create website",
    });
  }
};



const createWebsitePage = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id: websiteId } = req.params;
    const { name, slug } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Page name is required",
      });
    }

    const page = await websiteService.createWebsitePage(
      websiteId,
      { name: name.trim(), slug },
      userId
    );

    return res.status(201).json({
      success: true,
      data: page,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error("Create website page error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "A page with this slug already exists",
      });
    }

    if (error.message === "Website not found or unauthorized") {
      return res.status(404).json({
        success: false,
        message: error.message,
      ...(error.details ? { code: error.code, errors: error.details } : {}),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create website page",
    });
  }
};

const updateWebsitePage = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { pageId } = req.params;
    const { name, slug } = req.body;

    if (
      name === undefined &&
      slug === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Provide a page name or slug to update",
      });
    }

    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Page name must be a non-empty string",
      });
    }

    if (
      slug !== undefined &&
      (typeof slug !== "string" || !slug.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Page slug must be a non-empty string",
      });
    }

    const page = await websiteService.updateWebsitePage(
      pageId,
      {
        ...(name !== undefined && { name: name.trim() }),
        ...(slug !== undefined && { slug: slug.trim() }),
      },
      userId
    );

    return res.json({
      success: true,
      data: page,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error("Update website page error:", error);

    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "A page with this slug already exists",
      });
    }

    if (error.message === "Website page not found or unauthorized") {
      return res.status(404).json({
        success: false,
        message: error.message,
      ...(error.details ? { code: error.code, errors: error.details } : {}),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update website page",
    });
  }
};

const deleteWebsitePage = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { pageId } = req.params;

    const result = await websiteService.deleteWebsitePage(
      pageId,
      userId
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error("Delete website page error:", error);

    if (error.message === "Website page not found or unauthorized") {
      return res.status(404).json({
        success: false,
        message: error.message,
      ...(error.details ? { code: error.code, errors: error.details } : {}),
      });
    }

    if (error.message === "Cannot delete the last page") {
      return res.status(400).json({
        success: false,
        message: error.message,
      ...(error.details ? { code: error.code, errors: error.details } : {}),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete website page",
    });
  }
};

const getPageEditorData = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id: websiteId, pageId } = req.params;
    const page = await websiteService.getWebsitePageEditorData(
      websiteId,
      pageId,
      userId
    );

    return res.json({
      success: true,
      data: page,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error("Get website page editor data error:", error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to load page editor data",
      ...(error.details ? { code: error.code, errors: error.details } : {}),
    });
  }
};

const savePageEditorData = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id: websiteId, pageId } = req.params;
    const page = await websiteService.saveWebsitePageEditorData(
      websiteId,
      pageId,
      req.body?.editorData,
      req.body?.responsive,
      userId
    );

    return res.json({
      success: true,
      message: "Page document saved successfully",
      data: page,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error("Save website page editor data error:", error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to save page editor data",
      ...(error.details ? { code: error.code, errors: error.details } : {}),
    });
  }
};

const duplicateWebsitePage = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id: websiteId, pageId } = req.params;
    const page = await websiteService.duplicateWebsitePage(
      websiteId,
      pageId,
      userId
    );

    return res.status(201).json({
      success: true,
      message: "Page duplicated successfully",
      data: page,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error("Duplicate website page error:", error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to duplicate page",
      ...(error.details ? { code: error.code, errors: error.details } : {}),
    });
  }
};

const reorderWebsitePages = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id: websiteId } = req.params;
    const pages = await websiteService.reorderWebsitePages(
      websiteId,
      req.body?.pageIds,
      userId
    );

    return res.json({
      success: true,
      message: "Pages reordered successfully",
      data: pages,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error("Reorder website pages error:", error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: error.message || "Failed to reorder pages",
      ...(error.details ? { code: error.code, errors: error.details } : {}),
    });
  }
};



// Get website by ID
const getWebsite = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { id } = req.params;

    const website = await websiteService.getWebsiteById(id, userId);

    if (!website) {
      return res.status(404).json({
        success: false,
        message: "Website not found or unauthorized",
      });
    }

    res.json({
      success: true,
      data: website,
    });

  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error("Get website error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch website",
    });
  }
};

// Get all websites for the authenticated user
const getUserWebsites = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const websites = await websiteService.getUserWebsites(userId, page, limit);

    res.json({
      success: true,
      data: websites.data,
      pagination: websites.pagination,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error("Get user websites error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch websites",
    });
  }
};

const updateWebsite = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { id } = req.params;
    const { theme, name, slug } = req.body;

    const data = {};
    if (theme !== undefined) data.theme = theme;
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;

    const website = await websiteService.updateWebsite(id, data, userId);

    res.json({
      success: true,
      data: website,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error("Update website error:", error);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || "Failed to update website",
      ...(error.details ? { code: error.code, errors: error.details } : {}),
    });
  }
};

const updateWebsiteSection = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { sectionId } = req.params;

    const { content, config } = req.body;

    const section = await websiteService.updateWebsiteSection(
      sectionId,
      {
        ...(content !== undefined && { content }),
        ...(config !== undefined && { config }),
      },
      userId
    );

    res.json({
      success: true,
      data: section,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error("Update website section error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update website section",
    });
  }
};

const deleteWebsiteSection = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { sectionId } = req.params;

    const result = await websiteService.deleteWebsiteSection(
      sectionId,
      userId
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error(
      "Delete website section error:",
      error
    );

    if (error.message === "Website section not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      ...(error.details ? { code: error.code, errors: error.details } : {}),
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to delete website section",
    });
  }
};

const createWebsiteSection = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { pageId } = req.params;
    const { type, content, config } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Section type is required",
      });
    }

    const section = await websiteService.createWebsiteSection(
      pageId,
      {
        type,
        content,
        config,
      },
      userId
    );

    res.status(201).json({
      success: true,
      data: section,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error("Create website section error:", error);

    if (error.message === "Website page not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      ...(error.details ? { code: error.code, errors: error.details } : {}),
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create website section",
    });
  }
};


const reorderSections = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { pageId } = req.params;
    const { sections } = req.body;

    if (!Array.isArray(sections) || sections.length === 0) {
      return res.status(400).json({
        success: false,
        message: "sections must be a non-empty array",
      });
    }

    const websitePage =
      await websiteService.reorderWebsiteSections({
        pageId,
        sections,
        userId,
      });

    res.json({
      success: true,
      data: websitePage,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error("Reorder sections error:", error);

    if (error.message === "Website page not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      ...(error.details ? { code: error.code, errors: error.details } : {}),
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to reorder sections",
    });
  }
};

const saveWebsiteDraft = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { id } = req.params;
    const { pages, theme, name } = req.body;

    if (!Array.isArray(pages)) {
      return res.status(400).json({ success: false, message: "pages must be an array" });
    }

    const website = await websiteService.saveWebsiteDraft(id, pages, userId, theme, name);

    res.json({
      success: true,
      websiteId: website.id,
      updatedAt: website.updatedAt,
      idMappings: website.idMappings,
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    if (error.statusCode && error.statusCode < 500) {
      return res.status(error.statusCode).json({ success: false, message: error.message, ...(error.details ? { code: error.code, errors: error.details } : {}) });
    }
    console.error("Save draft error:", error);
    
    if (error.message === "Website not found or unauthorized") {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === "Invalid payload") {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.status(500).json({ success: false, message: "Failed to save draft" });
  }
};

const publishWebsite = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { id } = req.params;
    const { customSlug } = req.body || {};

    const website = await websiteService.publishWebsite(id, userId, customSlug);

    res.json({
      success: true,
      websiteId: website.id,
      name: website.name,
      slug: website.slug,
      isPublished: website.isPublished,
      publishedAt: website.publishedAt,
      publicUrl: `/${website.slug}`,
      ...(website.revision ? { revision: website.revision } : {}),
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error("Publish website error:", error);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: error.message || "Failed to publish website",
      ...(error.details ? { code: error.code, errors: error.details } : {}),
    });
  }
};

const getPublicWebsite = async (req, res) => {
  try {
    const { slug } = req.params;

    const publishedWebsite = await websiteService.getPublishedWebsiteBySlug(slug);

    if (!publishedWebsite) {
      return res.status(404).json({ success: false, message: "Website not found" });
    }

    res.json({
      success: true,
      ...publishedWebsite
    });
  } catch (error) {
    if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ success: false, message: error.message, code: error.code, ...(error.concurrency ? { concurrency: error.concurrency } : {}), ...(error.details ? { errors: error.details } : {}) });
    console.error("Get public website error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch public website" });
  }
};

module.exports = {
  createWebsite,
  getWebsite,
  getUserWebsites,
  updateWebsiteSection,
  reorderSections,
  createWebsiteSection,
  deleteWebsiteSection,
  updateWebsite,
  saveWebsiteDraft,
  publishWebsite,
  getPublicWebsite,
  createWebsitePage,
  updateWebsitePage,
  deleteWebsitePage,
  getPageEditorData,
  savePageEditorData,
  duplicateWebsitePage,
  reorderWebsitePages,
};
