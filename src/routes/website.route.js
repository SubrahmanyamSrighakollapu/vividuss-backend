
const express = require("express");

const {
  createWebsite,
  getWebsite,
  createWebsiteSection,
  updateWebsiteSection,
  reorderSections,
  deleteWebsiteSection,
  updateWebsite,
  saveWebsiteDraft,
  getUserWebsites,
  publishWebsite,
  getPublicWebsite,
  createWebsitePage,
  updateWebsitePage,
  deleteWebsitePage,
  getPageEditorData,
  savePageEditorData,
  duplicateWebsitePage,
  reorderWebsitePages,
} = require("../controllers/website.controller");

const router = express.Router();
router.use(require("../lib/publicationContext").requestContext);
const publication = require("../controllers/publication.controller");
router.get("/:id/publication-state", publication.state);
router.get("/:id/revisions", publication.list);
router.get("/:id/revisions/:revisionId", publication.get);
router.post("/:id/revisions/:revisionId/restore", publication.restore);
router.put("/:id/layout", publication.layout);

/**
 * @swagger
 * /api/websites/public/{slug}:
 *   get:
 *     summary: Get a published website by slug
 *     tags: [Websites]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Published website returned
 *       404:
 *         description: Website not found
 *       500:
 *         description: Failed to fetch website
 */
router.get("/public/:slug", getPublicWebsite);

/**
 * @swagger
 * /api/websites:
 *   get:
 *     summary: List the current user's websites
 *     tags: [Websites]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Websites and pagination returned
 *       401:
 *         description: Authentication required
 *   post:
 *     summary: Create a website
 *     tags: [Websites]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Website creation fields are determined by the controller and service.
 *             additionalProperties: true
 *     responses:
 *       201:
 *         description: Website created
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Failed to create website
 */
router.get("/", getUserWebsites);
router.post("/", createWebsite);

/**
 * @swagger
 * /api/websites/{id}/draft:
 *   patch:
 *     summary: Save website draft
 *     tags: [Websites]
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
 *             required: [pages]
 *             properties:
 *               pages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   additionalProperties: true
 *               theme:
 *                 type: object
 *                 nullable: true
 *                 additionalProperties: true
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Draft saved
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Website not found or unauthorized
 */
router.patch("/:id/draft", saveWebsiteDraft);

/**
 * @swagger
 * /api/websites/{id}/publish:
 *   post:
 *     summary: Publish a website
 *     tags: [Websites]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Website published
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Website not found or unauthorized
 */
router.post("/:id/publish", publishWebsite);

/**
 * @swagger
 * /api/websites/{id}/pages:
 *   post:
 *     summary: Create a website page
 *     tags: [Websites]
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *     responses:
 *       201:
 *         description: Page created
 *       400:
 *         description: Page name is required
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Website not found or unauthorized
 *       409:
 *         description: Page slug already exists
 */
router.post("/:id/pages", createWebsitePage);

/**
 * @swagger
 * /api/websites/pages/{pageId}:
 *   patch:
 *     summary: Update a website page
 *     tags: [Websites]
 *     parameters:
 *       - in: path
 *         name: pageId
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
 *     responses:
 *       200:
 *         description: Page updated
 *       400:
 *         description: Invalid or missing update fields
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Page not found or unauthorized
 *       409:
 *         description: Page slug already exists
 *   delete:
 *     summary: Delete a website page
 *     tags: [Websites]
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Page deleted
 *       400:
 *         description: Cannot delete the last page
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Page not found or unauthorized
 */
router.patch("/pages/:pageId", updateWebsitePage);
router.delete("/pages/:pageId", deleteWebsitePage);

router.get("/:id/pages/:pageId/editor-data", getPageEditorData);
router.put("/:id/pages/:pageId/editor-data", savePageEditorData);
router.post("/:id/pages/:pageId/duplicate", duplicateWebsitePage);
router.patch("/:id/pages/reorder", reorderWebsitePages);
router.patch("/:id/pages/:pageId", updateWebsitePage);
router.delete("/:id/pages/:pageId", deleteWebsitePage);

/**
 * @swagger
 * /api/websites/{id}:
 *   get:
 *     summary: Get a website by ID
 *     tags: [Websites]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Website returned
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Website not found or unauthorized
 *   patch:
 *     summary: Update website name or theme
 *     tags: [Websites]
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
 *               theme:
 *                 type: object
 *                 nullable: true
 *                 additionalProperties: true
 *     responses:
 *       200:
 *         description: Website updated
 *       401:
 *         description: Authentication required
 */
router.get("/:id", getWebsite);
router.patch("/:id", updateWebsite);

/**
 * @swagger
 * /api/websites/sections/{sectionId}:
 *   delete:
 *     summary: Delete a website section
 *     tags: [Websites]
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Section deleted
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Section not found
 *   patch:
 *     summary: Update a website section
 *     tags: [Websites]
 *     parameters:
 *       - in: path
 *         name: sectionId
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
 *               content:
 *                 type: object
 *                 nullable: true
 *                 additionalProperties: true
 *               config:
 *                 type: object
 *                 nullable: true
 *                 additionalProperties: true
 *     responses:
 *       200:
 *         description: Section updated
 *       401:
 *         description: Authentication required
 */
router.delete("/sections/:sectionId", deleteWebsiteSection);
router.patch("/sections/:sectionId", updateWebsiteSection);

/**
 * @swagger
 * /api/websites/pages/{pageId}/sections:
 *   post:
 *     summary: Create a section on a website page
 *     tags: [Websites]
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type:
 *                 type: string
 *               content:
 *                 type: object
 *                 additionalProperties: true
 *               config:
 *                 type: object
 *                 additionalProperties: true
 *     responses:
 *       201:
 *         description: Section created
 *       400:
 *         description: Section type is required
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Website page not found
 */
router.post("/pages/:pageId/sections", createWebsiteSection);

/**
 * @swagger
 * /api/websites/pages/{pageId}/sections/reorder:
 *   patch:
 *     summary: Reorder sections on a website page
 *     tags: [Websites]
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sections]
 *             properties:
 *               sections:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   additionalProperties: true
 *     responses:
 *       200:
 *         description: Sections reordered
 *       400:
 *         description: sections must be a non-empty array
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Website page not found
 */
router.patch("/pages/:pageId/sections/reorder", reorderSections);

module.exports = router;
