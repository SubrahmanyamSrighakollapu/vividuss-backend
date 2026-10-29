
const templateService = require("../services/template.service");

const handleError = (res, error, fallbackMessage) => {
  if (error.statusCode) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.details ? { code: error.code, errors: error.details } : {}),
    });
  }

  if (error.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Template not found",
    });
  }

  if (error.code === "P2002") {
  return res.status(409).json({
    success: false,
    message: "A page with this slug already exists",
  });
}

  console.error(fallbackMessage, error);

  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

const getTemplates = async (req, res) => {
  try {
    const templates = await templateService.getAllTemplates();
    return res.json({ success: true, data: templates });
  } catch (error) {
    return handleError(res, error, "Failed to fetch templates");
  }
};

const getAdminTemplates = async (req, res) => {
  try {
    const templates = await templateService.getAllTemplates({
      includeDrafts: true,
    });
    return res.json({ success: true, data: templates });
  } catch (error) {
    return handleError(res, error, "Failed to fetch admin templates");
  }
};

const getTemplate = async (req, res) => {
  try {
    const template = await templateService.getTemplateById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Published template not found",
      });
    }

    return res.json({ success: true, data: template });
  } catch (error) {
    return handleError(res, error, "Failed to fetch template");
  }
};

const getAdminTemplate = async (req, res) => {
  try {
    const template = await templateService.getTemplateById(req.params.id, {
      includeDrafts: true,
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: "Template not found",
      });
    }

    return res.json({ success: true, data: template });
  } catch (error) {
    return handleError(res, error, "Failed to fetch template");
  }
};

const createTemplate = async (req, res) => {
  try {
    const { name, description, categoryId, thumbnail } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Template name is required",
      });
    }

    const template = await templateService.createTemplate({
      name,
      description,
      categoryId: categoryId || null,
      thumbnail,
    });

    return res.status(201).json({
      success: true,
      message: "Template draft created successfully",
      data: template,
    });
  } catch (error) {
    return handleError(res, error, "Failed to create template");
  }
};

const updateTemplate = async (req, res) => {
  try {
    const { name, description, categoryId, thumbnail } = req.body;

    const template = await templateService.updateTemplate(req.params.id, {
      name,
      description,
      categoryId,
      thumbnail,
    });

    return res.json({
      success: true,
      message: "Template updated successfully",
      data: template,
    });
  } catch (error) {
    return handleError(res, error, "Failed to update template");
  }
};

const assignTemplateCategory = async (req, res) => {
  try {
    const { categoryId } = req.body;

    if (
      categoryId !== null &&
      categoryId !== "" &&
      (typeof categoryId !== "string" || !categoryId.trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "categoryId must be a category ID or null",
      });
    }

    const template = await templateService.assignTemplateCategory(
      req.params.id,
      categoryId ? categoryId.trim() : null
    );

    return res.json({
      success: true,
      message: "Template category updated successfully",
      data: template,
    });
  } catch (error) {
    return handleError(res, error, "Failed to assign template category");
  }
};

const updateTemplateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const template = await templateService.setTemplateStatus(
      req.params.id,
      status
    );

    return res.json({
      success: true,
      message:
        status === "PUBLISHED"
          ? "Template published successfully"
          : "Template moved to drafts",
      data: template,
    });
  } catch (error) {
    return handleError(res, error, "Failed to update template status");
  }
};

const deleteTemplate = async (req, res) => {
  try {
    await templateService.deleteTemplate(req.params.id);

    return res.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    return handleError(res, error, "Failed to delete template");
  }
};



const createSection = async (req, res) => {
  try {
    const section = await templateService.createSection(
      req.params.id,
      req.params.pageId,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Section added successfully",
      data: section,
    });
  } catch (error) {
    return handleError(res, error, "Failed to add section");
  }
};

const updateSection = async (req, res) => {
  try {
    const section = await templateService.updateSection(
      req.params.sectionId,
      req.body
    );

    return res.json({
      success: true,
      message: "Section saved successfully",
      data: section,
    });
  } catch (error) {
    return handleError(res, error, "Failed to save section");
  }
};

const deleteSection = async (req, res) => {
  try {
    await templateService.deleteSection(req.params.sectionId);

    return res.json({
      success: true,
      message: "Section deleted successfully",
    });
  } catch (error) {
    return handleError(res, error, "Failed to delete section");
  }
};

const reorderSections = async (req, res) => {
  try {
    const sections = await templateService.reorderSections(
      req.params.id,
      req.params.pageId,
      req.body.sectionIds
    );

    return res.json({
      success: true,
      message: "Sections reordered successfully",
      data: sections,
    });
  } catch (error) {
    return handleError(res, error, "Failed to reorder sections");
  }
};


const getPageEditorData = async (req, res) => {
  try {
    const page = await templateService.getPageEditorData(
      req.params.id,
      req.params.pageId
    );

    return res.json({
      success: true,
      data: page,
    });
  } catch (error) {
    return handleError(res, error, "Failed to load page editor data");
  }
};

const savePageEditorData = async (req, res) => {
  try {
    const page = await templateService.savePageEditorData(
      req.params.id,
      req.params.pageId,
      req.body?.editorData,
      req.body?.responsive
    );

    return res.json({
      success: true,
      message: "Page document saved successfully",
      data: page,
    });
  } catch (error) {
    return handleError(res, error, "Failed to save page editor data");
  }
};




const createPage = async (req, res) => {
  try {
    const page = await templateService.createPage(
      req.params.id,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Page created successfully",
      data: page,
    });
  } catch (error) {
    return handleError(res, error, "Failed to create page");
  }
};

const renamePage = async (req, res) => {
  try {
    const page = await templateService.renamePage(
      req.params.id,
      req.params.pageId,
      req.body
    );

    return res.json({
      success: true,
      message: "Page updated successfully",
      data: page,
    });
  } catch (error) {
    return handleError(res, error, "Failed to update page");
  }
};

const duplicatePage = async (req, res) => {
  try {
    const page = await templateService.duplicatePage(
      req.params.id,
      req.params.pageId
    );

    return res.status(201).json({
      success: true,
      message: "Page duplicated successfully",
      data: page,
    });
  } catch (error) {
    return handleError(res, error, "Failed to duplicate page");
  }
};

const deletePage = async (req, res) => {
  try {
    await templateService.deletePage(
      req.params.id,
      req.params.pageId
    );

    return res.json({
      success: true,
      message: "Page deleted successfully",
    });
  } catch (error) {
    return handleError(res, error, "Failed to delete page");
  }
};

const reorderPages = async (req, res) => {
  try {
    const pages = await templateService.reorderPages(
      req.params.id,
      req.body.pageIds
    );

    return res.json({
      success: true,
      message: "Pages reordered successfully",
      data: pages,
    });
  } catch (error) {
    return handleError(res, error, "Failed to reorder pages");
  }
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
  getTemplates,
  getTemplate,
  getAdminTemplates,
  getAdminTemplate,
  createTemplate,
  updateTemplate,
  assignTemplateCategory,
  updateTemplateStatus,
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
  getAdminGlobalLayout,
updateAdminGlobalLayout,
};
