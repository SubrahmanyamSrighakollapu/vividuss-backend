const prisma = require("../lib/prisma");

const getAllCategories = async ({ includeInactive = false } = {}) => {
  return prisma.websiteCategory.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { templates: true } },
    },
  });
};

const getCategoryById = async (id, includeInactive = false) => {
  return prisma.websiteCategory.findFirst({
    where: {
      id,
      ...(includeInactive ? {} : { isActive: true }),
    },
    include: {
      _count: { select: { templates: true } },
    },
  });
};

const createCategory = async (data) => {
  return prisma.websiteCategory.create({ data });
};

const updateCategory = async (id, data) => {
  return prisma.websiteCategory.update({
    where: { id },
    data,
  });
};

const setCategoryActive = async (id, isActive) => {
  return prisma.websiteCategory.update({
    where: { id },
    data: { isActive },
  });
};

const deleteCategory = async (id) => {
  const category = await prisma.websiteCategory.findUnique({
    where: { id },
    include: { _count: { select: { templates: true } } },
  });

  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  if (category._count.templates > 0) {
    const error = new Error(
      "This category has templates assigned. Reassign them before deleting it."
    );
    error.statusCode = 409;
    throw error;
  }

  return prisma.websiteCategory.delete({ where: { id } });
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  setCategoryActive,
  deleteCategory,
};