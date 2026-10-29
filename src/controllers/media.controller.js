const mediaService = require("../services/media.service");
const storageService = require("../services/storage.service");
const { detectImageMime, isAllowedImageMime } = require("../lib/fileValidation");
const { getAuth } = require("@clerk/express");

const getMediaAssets = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized. Please sign in." });
    }

    const { page, limit, search } = req.query;
    const assets = await mediaService.getMediaAssets(userId, { page, limit, search });
    res.json({ success: true, data: assets });
  } catch (error) {
    console.error("[MediaController] Error getting media assets:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to fetch media assets" });
  }
};

const getMediaAsset = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized. Please sign in." });
    }

    const asset = await mediaService.getMediaAssetById(req.params.id, userId);
    if (!asset) {
      return res.status(404).json({ success: false, message: "Asset not found" });
    }

    res.json({ success: true, data: asset });
  } catch (error) {
    console.error("[MediaController] Error getting media asset:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to fetch media asset" });
  }
};

const createMediaAsset = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized. Please sign in." });
    }

    const { url, filename, alt, mimeType, width, height } = req.body;
    if (!url || typeof url !== "string" || !url.trim()) {
      return res.status(400).json({ success: false, message: "Valid image URL is required" });
    }

    // Basic URL format validation
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ success: false, message: "Invalid URL format" });
    }

    const asset = await mediaService.createMediaAsset(userId, {
      url: url.trim(),
      filename: filename || url.split("/").pop() || "Image",
      alt: alt || null,
      mimeType: mimeType || null,
      width: width ? Number(width) : null,
      height: height ? Number(height) : null,
      provider: "url",
    });

    res.status(201).json({ success: true, data: asset });
  } catch (error) {
    console.error("[MediaController] Error creating media asset:", error.message || error);
    res.status(500).json({ success: false, message: "Failed to create media asset" });
  }
};

const uploadMediaAsset = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized. Please sign in." });
    }

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: "No image file provided" });
    }

    const file = req.file;

    // Enforce 10MB maximum limit
    if (file.size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "File exceeds 10MB size limit. Please upload a smaller image.",
      });
    }

    // Verify declared MIME type
    if (!isAllowedImageMime(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported file type. Only JPEG, PNG, WebP, and GIF are permitted.",
      });
    }

    // Deep inspection of buffer magic bytes (prevent spoofed extensions)
    const detectedMime = detectImageMime(file.buffer);
    if (!detectedMime) {
      return res.status(400).json({
        success: false,
        message: "Corrupt or unrecognized image file signature. Please select a valid image.",
      });
    }

    if (!isAllowedImageMime(detectedMime)) {
      return res.status(400).json({ success: false, message: "Unsupported image content. SVG uploads are disabled." });
    }
    const finalMime = detectedMime;

    // Upload to ImageKit via storageService
    const uploadResult = await storageService.upload(
      file.buffer,
      finalMime,
      userId,
      file.originalname
    );

    try {
      // Create DB record scoped to authenticated user
      const asset = await mediaService.createMediaAsset(userId, {
        url: uploadResult.url,
        filename: file.originalname || uploadResult.filename,
        alt: null,
        mimeType: uploadResult.mimeType || finalMime,
        width: uploadResult.width,
        height: uploadResult.height,
        provider: "imagekit",
        providerId: uploadResult.providerId,
      });

      return res.status(201).json({ success: true, data: asset });
    } catch (dbError) {
      console.error("[MediaController] DB save failed, rolling back uploaded file from ImageKit:", dbError);
      try {
        await storageService.delete(uploadResult.providerId, "imagekit");
      } catch (cleanupError) {
        console.error("[MediaController] ImageKit rollback cleanup error:", cleanupError.message);
      }
      return res.status(500).json({ success: false, message: "Failed to persist media asset record" });
    }
  } catch (error) {
    console.error("[MediaController] Error uploading media asset:", error.message || error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode === 503 ? error.message : "Failed to upload media asset",
    });
  }
};

const updateMediaAsset = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized. Please sign in." });
    }

    const { alt, filename } = req.body;
    const data = {};
    if (alt !== undefined) data.alt = alt;
    if (filename !== undefined) data.filename = filename;

    const asset = await mediaService.updateMediaAsset(req.params.id, userId, data);
    res.json({ success: true, data: asset });
  } catch (error) {
    console.error("[MediaController] Error updating media asset:", error.message || error);
    if (error.message === "Media asset not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Failed to update media asset" });
  }
};

const deleteMediaAsset = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized. Please sign in." });
    }

    await mediaService.deleteMediaAsset(req.params.id, userId);
    res.json({ success: true, message: "Media asset deleted successfully" });
  } catch (error) {
    console.error("[MediaController] Error deleting media asset:", error.message || error);
    if (error.message === "Media asset not found") {
      return res.status(404).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: "Failed to delete media asset" });
  }
};

module.exports = {
  getMediaAssets,
  getMediaAsset,
  createMediaAsset,
  uploadMediaAsset,
  updateMediaAsset,
  deleteMediaAsset,
};
