
const express = require("express");
const requireAdmin = require("../middleware/requireAdmin");

const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  setCategoryStatus,
  deleteCategory,
} = require("../controllers/category.controller");

const router = express.Router();

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: List categories
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *         description: Include inactive categories when authorized as an admin.
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 */
router.get("/", getCategories);
router.get("/admin", requireAdmin, getCategories);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Get a category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category retrieved successfully
 *       404:
 *         description: Category not found
 */
router.get("/:id", getCategory);

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a category
 *     tags: [Categories]
 *     description: Requires admin authorization.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Portfolio
 *               slug:
 *                 type: string
 *                 example: portfolio
 *               description:
 *                 type: string
 *                 nullable: true
 *               icon:
 *                 type: string
 *                 nullable: true
 *               thumbnail:
 *                 type: string
 *                 nullable: true
 *               sortOrder:
 *                 type: integer
 *                 default: 0
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Invalid request data
 *       409:
 *         description: Category slug already exists
 */
router.post("/", requireAdmin, createCategory);

/**
 * @swagger
 * /api/categories/{id}:
 *   patch:
 *     summary: Update a category
 *     tags: [Categories]
 *     description: Requires admin authorization.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               description:
 *                 type: string
 *                 nullable: true
 *               icon:
 *                 type: string
 *                 nullable: true
 *               thumbnail:
 *                 type: string
 *                 nullable: true
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category slug already exists
 */
router.patch("/:id", requireAdmin, updateCategory);

/**
 * @swagger
 * /api/categories/{id}/status:
 *   patch:
 *     summary: Activate or deactivate a category
 *     tags: [Categories]
 *     description: Requires admin authorization.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Category status updated successfully
 *       400:
 *         description: isActive must be a boolean
 *       404:
 *         description: Category not found
 */
router.patch("/:id/status", requireAdmin, setCategoryStatus);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     tags: [Categories]
 *     description: Requires admin authorization.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category cannot be deleted due to a conflict
 */
router.delete("/:id", requireAdmin, deleteCategory);

module.exports = router;
