const express = require("express");
const requireAdmin = require("../middleware/requireAdmin");

const {
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
} = require("../controllers/template.controller");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Templates
 *   description: Public template gallery and admin template management
 */

/**
 * @swagger
 * /api/templates:
 *   get:
 *     summary: Get published templates
 *     description: Returns published templates for the public template gallery.
 *     tags: [Templates]
 *     responses:
 *       200:
 *         description: Published templates retrieved successfully
 *       500:
 *         description: Failed to fetch templates
 *
 *   post:
 *     summary: Create a template
 *     description: Creates a new template. Admin access is required.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Template properties accepted by the template controller.
 *             additionalProperties: true
 *             example:
 *               name: Portfolio Template
 *               description: A portfolio website template
 *     responses:
 *       201:
 *         description: Template created successfully
 *       400:
 *         description: Invalid template data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Failed to create template
 */

/**
 * @swagger
 * /api/templates/admin:
 *   get:
 *     summary: Get all admin templates
 *     description: Returns templates available in the admin management view.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Admin templates retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Failed to fetch admin templates
 */

/**
 * @swagger
 * /api/templates/admin/{id}:
 *   get:
 *     summary: Get a template for admin management
 *     description: Retrieves a template by ID for administrative management.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template not found
 *       500:
 *         description: Failed to fetch template
 */

/**
 * @swagger
 * /api/templates/{id}:
 *   get:
 *     summary: Get a published template
 *     description: Retrieves the public details of a published template by ID.
 *     tags: [Templates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Published template retrieved successfully
 *       404:
 *         description: Template not found or not published
 *       500:
 *         description: Failed to fetch template
 *
 *   patch:
 *     summary: Update a template
 *     description: Updates template properties. Admin access is required.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *             description: Template fields accepted by the update controller.
 *     responses:
 *       200:
 *         description: Template updated successfully
 *       400:
 *         description: Invalid template data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template not found
 *       500:
 *         description: Failed to update template
 *
 *   delete:
 *     summary: Delete a template
 *     description: Deletes a template. Admin access is required.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Template deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template not found
 *       500:
 *         description: Failed to delete template
 */

/**
 * @swagger
 * /api/templates/{id}/category:
 *   patch:
 *     summary: Assign a category to a template
 *     description: Changes the category assigned to a template. Admin access is required.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *             description: Category assignment data accepted by the controller.
 *     responses:
 *       200:
 *         description: Template category updated successfully
 *       400:
 *         description: Invalid category data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template or category not found
 *       500:
 *         description: Failed to assign template category
 */

/**
 * @swagger
 * /api/templates/{id}/status:
 *   patch:
 *     summary: Update template status
 *     description: Changes a template's publication or status setting. Admin access is required.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *             description: Status fields accepted by the controller.
 *     responses:
 *       200:
 *         description: Template status updated successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template not found
 *       500:
 *         description: Failed to update template status
 */

/**
 * @swagger
 * /api/templates/admin/{id}/pages:
 *   post:
 *     summary: Create a template page
 *     description: Adds a page to a template. Admin access is required.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *             description: Page properties accepted by the controller.
 *     responses:
 *       201:
 *         description: Template page created successfully
 *       400:
 *         description: Invalid page data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template not found
 *       500:
 *         description: Failed to create page
 */

/**
 * @swagger
 * /api/templates/admin/{id}/pages/reorder:
 *   patch:
 *     summary: Reorder template pages
 *     description: Changes the order of pages within a template. Admin access is required.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *             description: Page ordering data accepted by the controller.
 *     responses:
 *       200:
 *         description: Template pages reordered successfully
 *       400:
 *         description: Invalid page ordering data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template not found
 *       500:
 *         description: Failed to reorder pages
 */

/**
 * @swagger
 * /api/templates/admin/{id}/pages/{pageId}:
 *   patch:
 *     summary: Rename a template page
 *     description: Updates the properties of a template page. Admin access is required.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Template page ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *             description: Page update data accepted by the controller.
 *     responses:
 *       200:
 *         description: Template page updated successfully
 *       400:
 *         description: Invalid page data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template or page not found
 *       500:
 *         description: Failed to update page
 *
 *   delete:
 *     summary: Delete a template page
 *     description: Deletes a page from a template. Admin access is required.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Template page ID
 *     responses:
 *       200:
 *         description: Template page deleted successfully
 *       400:
 *         description: Invalid request or page cannot be deleted
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template or page not found
 *       500:
 *         description: Failed to delete page
 */

/**
 * @swagger
 * /api/templates/admin/{id}/pages/{pageId}/duplicate:
 *   post:
 *     summary: Duplicate a template page
 *     description: Creates a duplicate of a template page. Admin access is required.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Source page ID
 *     responses:
 *       201:
 *         description: Template page duplicated successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template or page not found
 *       500:
 *         description: Failed to duplicate page
 */

/**
 * @swagger
 * /api/templates/admin/{id}/pages/{pageId}/editor-data:
 *   get:
 *     summary: Get template page editor data
 *     description: Retrieves page data required by the admin editor.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Template page ID
 *     responses:
 *       200:
 *         description: Editor data retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template or page not found
 *       500:
 *         description: Failed to fetch editor data
 *
 *   put:
 *     summary: Save template page editor data
 *     description: Saves page editor data for a template page.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Template page ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *             description: Editor data accepted by the controller.
 *     responses:
 *       200:
 *         description: Editor data saved successfully
 *       400:
 *         description: Invalid editor data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template or page not found
 *       500:
 *         description: Failed to save editor data
 */

/**
 * @swagger
 * /api/templates/admin/{id}/global-layout:
 *   get:
 *     summary: Get template global layout
 *     description: Retrieves the global layout configuration for a template.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     responses:
 *       200:
 *         description: Global layout retrieved successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template not found
 *       500:
 *         description: Failed to fetch global layout
 *
 *   put:
 *     summary: Update template global layout
 *     description: Saves the global layout configuration for a template.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *             description: Global layout data accepted by the controller.
 *     responses:
 *       200:
 *         description: Global layout updated successfully
 *       400:
 *         description: Invalid global layout data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template not found
 *       500:
 *         description: Failed to update global layout
 */

/**
 * @swagger
 * /api/templates/{id}/pages/{pageId}/sections:
 *   post:
 *     summary: Create a section in a template page
 *     description: Adds a section to a template page. Admin access is required.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Template page ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *             description: Section data accepted by the controller.
 *     responses:
 *       201:
 *         description: Section created successfully
 *       400:
 *         description: Invalid section data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template or page not found
 *       500:
 *         description: Failed to create section
 */

/**
 * @swagger
 * /api/templates/{id}/pages/{pageId}/sections/reorder:
 *   patch:
 *     summary: Reorder sections in a template page
 *     description: Updates the order of sections on a template page.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Template ID
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Template page ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *             description: Section ordering data accepted by the controller.
 *     responses:
 *       200:
 *         description: Sections reordered successfully
 *       400:
 *         description: Invalid section ordering data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Template or page not found
 *       500:
 *         description: Failed to reorder sections
 */

/**
 * @swagger
 * /api/templates/sections/{sectionId}:
 *   patch:
 *     summary: Update a template section
 *     description: Updates an existing template section. Admin access is required.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Template section ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             additionalProperties: true
 *             description: Section update data accepted by the controller.
 *     responses:
 *       200:
 *         description: Section updated successfully
 *       400:
 *         description: Invalid section data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Section not found
 *       500:
 *         description: Failed to update section
 *
 *   delete:
 *     summary: Delete a template section
 *     description: Deletes an existing template section. Admin access is required.
 *     tags: [Templates]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Template section ID
 *     responses:
 *       200:
 *         description: Section deleted successfully
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Section not found
 *       500:
 *         description: Failed to delete section
 */

// Public template gallery: published templates only.
router.get("/", getTemplates);

router.get(
  "/admin/:id/pages/:pageId/editor-data",
  requireAdmin,
  getPageEditorData
);

router.put(
  "/admin/:id/pages/:pageId/editor-data",
  requireAdmin,
  savePageEditorData
);

router.post("/:id/pages/:pageId/sections", requireAdmin, createSection);

router.patch(
  "/:id/pages/:pageId/sections/reorder",
  requireAdmin,
  reorderSections
);

/* Admin-only page management */
router.post("/admin/:id/pages", requireAdmin, createPage);

router.patch(
  "/admin/:id/pages/reorder",
  requireAdmin,
  reorderPages
);

router.patch(
  "/admin/:id/pages/:pageId",
  requireAdmin,
  renamePage
);

router.post(
  "/admin/:id/pages/:pageId/duplicate",
  requireAdmin,
  duplicatePage
);

router.delete(
  "/admin/:id/pages/:pageId",
  requireAdmin,
  deletePage
);

// Duplicate route retained from the original file.
// Remove one registration after confirming it is accidental.
router.patch(
  "/admin/:id/pages/reorder",
  requireAdmin,
  reorderPages
);

router.get(
  "/admin/:id/global-layout",
  requireAdmin,
  getAdminGlobalLayout
);

router.put(
  "/admin/:id/global-layout",
  requireAdmin,
  updateAdminGlobalLayout
);

router.patch("/sections/:sectionId", requireAdmin, updateSection);

router.delete("/sections/:sectionId", requireAdmin, deleteSection);

// Admin-only template management.
router.get("/admin", requireAdmin, getAdminTemplates);
router.post("/", requireAdmin, createTemplate);
router.get("/admin/:id", requireAdmin, getAdminTemplate);
router.patch("/:id/category", requireAdmin, assignTemplateCategory);
router.patch("/:id", requireAdmin, updateTemplate);
router.patch("/:id/status", requireAdmin, updateTemplateStatus);
router.delete("/:id", requireAdmin, deleteTemplate);

// Public detail: published templates only.
router.get("/:id", getTemplate);

module.exports = router;