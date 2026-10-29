const express = require("express");
const multer = require("multer");
const {
  getMediaAssets,
  getMediaAsset,
  createMediaAsset,
  uploadMediaAsset,
  updateMediaAsset,
  deleteMediaAsset,
} = require("../controllers/media.controller");

const requireUser = require("../middleware/requireUser");
const router = express.Router();
router.use(requireUser);

// Multer memory storage configuration with 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedMimes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Invalid file format. Only JPEG, PNG, WebP, and GIF images are supported."
        )
      );
    }

    cb(null, true);
  },
});

/**
 * Custom Multer upload wrapper to handle file-size and format errors cleanly.
 */
const handleUpload = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Uploaded file exceeds the maximum 10MB size limit.",
        });
      }

      return res.status(400).json({
        success: false,
        message: err.message || "File upload error occurred",
      });
    }

    next();
  });
};

/**
 * @swagger
 * tags:
 *   name: Media
 *   description: Media asset management and image uploads
 */

/**
 * @swagger
 * /api/media:
 *   get:
 *     summary: Get media assets
 *     description: Returns a paginated list of media assets belonging to the authenticated user. Supports pagination and search.
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *         description: Number of assets per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for media assets
 *     responses:
 *       200:
 *         description: Media assets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     additionalProperties: true
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Failed to fetch media assets
 *
 *   post:
 *     summary: Create a media asset from an existing URL
 *     description: Saves an externally hosted image URL as a media asset for the authenticated user.
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/images/banner.webp
 *               filename:
 *                 type: string
 *                 example: banner.webp
 *               alt:
 *                 type: string
 *                 nullable: true
 *                 example: Homepage banner
 *               mimeType:
 *                 type: string
 *                 nullable: true
 *                 example: image/webp
 *               width:
 *                 type: integer
 *                 nullable: true
 *                 example: 1200
 *               height:
 *                 type: integer
 *                 nullable: true
 *                 example: 600
 *     responses:
 *       201:
 *         description: Media asset created successfully
 *       400:
 *         description: URL is missing, invalid, or has an invalid format
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Failed to create media asset
 */

/**
 * @swagger
 * /api/media/upload:
 *   post:
 *     summary: Upload an image
 *     description: Uploads an image file using multipart/form-data. Supported formats are JPEG, PNG, WebP, and GIF. Maximum file size is 10 MB.
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Image file (maximum 10 MB)
 *     responses:
 *       201:
 *         description: Image uploaded and media asset created successfully
 *       400:
 *         description: Missing file, unsupported format, invalid image, or file exceeds 10 MB
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Failed to upload or save media asset
 */

/**
 * @swagger
 * /api/media/{id}:
 *   get:
 *     summary: Get a media asset
 *     description: Retrieves a media asset by its ID for the authenticated user.
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Media asset ID
 *     responses:
 *       200:
 *         description: Media asset retrieved successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Asset not found
 *       500:
 *         description: Failed to fetch media asset
 *
 *   patch:
 *     summary: Update a media asset
 *     description: Updates the filename and/or alternative text of an existing media asset.
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Media asset ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               alt:
 *                 type: string
 *                 nullable: true
 *                 example: Updated banner description
 *               filename:
 *                 type: string
 *                 example: updated-banner.webp
 *             minProperties: 1
 *     responses:
 *       200:
 *         description: Media asset updated successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Media asset not found
 *       500:
 *         description: Failed to update media asset
 *
 *   delete:
 *     summary: Delete a media asset
 *     description: Deletes a media asset belonging to the authenticated user.
 *     tags: [Media]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Media asset ID
 *     responses:
 *       200:
 *         description: Media asset deleted successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Media asset not found
 *       500:
 *         description: Failed to delete media asset
 */

// GET /api/media — List media assets
router.get("/", getMediaAssets);

// POST /api/media — Create a media asset from a URL
router.post("/", createMediaAsset);

// POST /api/media/upload — Upload an image file
router.post("/upload", handleUpload, uploadMediaAsset);

// GET /api/media/:id — Get one media asset
router.get("/:id", getMediaAsset);

// PATCH /api/media/:id — Update a media asset
router.patch("/:id", updateMediaAsset);

// DELETE /api/media/:id — Delete a media asset
router.delete("/:id", deleteMediaAsset);

module.exports = router;