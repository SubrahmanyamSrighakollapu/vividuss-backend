const categoryService = require("../services/category.service");

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const handleError = (res, error) => {
  if (error.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "A category with this slug already exists",
    });
  }

  if (error.code === "P2025") {
    return res.status(404).json({
      success: false,
      message: "Category not found",
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message:
      error.statusCode ? error.message : "Category operation failed",
  });
};

const getCategories = async (req, res) => {
  try {
    const isAdmin = Boolean(req.adminUserId);
    const categories = await categoryService.getAllCategories({
      includeInactive: isAdmin && req.query.includeInactive === "true",
    });

    return res.json({ success: true, data: categories });
  } catch (error) {
    return handleError(res, error);
  }
};

const getCategory = async (req, res) => {
  try {
    const category = await categoryService.getCategoryById(
      req.params.id,
      Boolean(req.adminUserId)
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.json({ success: true, data: category });
  } catch (error) {
    return handleError(res, error);
  }
};

const createCategory = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      icon,
      thumbnail,
      sortOrder = 0,
      isActive = true,
    } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    if (slug !== undefined && typeof slug !== "string") {
      return res.status(400).json({
        success: false,
        message: "Slug must be a string",
      });
    }

    for (const [field, value] of Object.entries({
      description,
      icon,
      thumbnail,
    })) {
      if (value !== undefined && value !== null &&
          typeof value !== "string") {
        return res.status(400).json({
          success: false,
          message: `${field} must be a string`,
        });
      }
    }

    if (!Number.isInteger(sortOrder)) {
      return res.status(400).json({
        success: false,
        message: "sortOrder must be an integer",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean",
      });
    }

    const cleanName = name.trim();
    const cleanSlug = slugify(slug?.trim() || cleanName);

    if (!cleanSlug) {
      return res.status(400).json({
        success: false,
        message: "A valid slug is required",
      });
    }

    const category = await categoryService.createCategory({
      name: cleanName,
      slug: cleanSlug,
      description: description?.trim() || null,
      icon: icon?.trim() || null,
      thumbnail: thumbnail?.trim() || null,
      sortOrder,
      isActive,
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const updateCategory = async (req, res) => {
  try {
    const { name, slug, description, icon, thumbnail, sortOrder } = req.body;
    const data = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Name must be a non-empty string",
        });
      }
      data.name = name.trim();
    }

    if (slug !== undefined) {
      if (typeof slug !== "string" || !slug.trim()) {
        return res.status(400).json({
          success: false,
          message: "Slug must be a non-empty string",
        });
      }
      data.slug = slugify(slug);
    }

    for (const [field, value] of Object.entries({
      description,
      icon,
      thumbnail,
    })) {
      if (value !== undefined) {
        if (value !== null && typeof value !== "string") {
          return res.status(400).json({
            success: false,
            message: `${field} must be a string or null`,
          });
        }
        data[field] = typeof value === "string" ? value.trim() || null : null;
      }
    }

    if (sortOrder !== undefined) {
      if (!Number.isInteger(sortOrder)) {
        return res.status(400).json({
          success: false,
          message: "sortOrder must be an integer",
        });
      }
      data.sortOrder = sortOrder;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one field to update",
      });
    }

    const category = await categoryService.updateCategory(
      req.params.id,
      data
    );

    return res.json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    return handleError(res, error);
  }
};


const setCategoryStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean",
      });
    }

    const category = await categoryService.setCategoryActive(
      req.params.id,
      isActive
    );

    return res.json({
      success: true,
      message: `Category ${isActive ? "activated" : "deactivated"}`,
      data: category,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

const deleteCategory = async (req, res) => {
  try {
    await categoryService.deleteCategory(req.params.id);

    return res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    return handleError(res, error);
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  setCategoryStatus,
  deleteCategory,
};