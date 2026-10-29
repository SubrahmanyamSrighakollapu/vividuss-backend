const path = require("path");
const crypto = require("crypto");
const { getImageKit } = require("../config/imagekit");

/**
 * ImageKit Media Storage Implementation
 * Uses @imagekit/nodejs SDK v7 to upload, retrieve, and delete media files.
 */
class ImageKitMediaStorage {
  async upload(fileBuffer, mimeType, userId, originalFilename = "image") {
    // Determine extension safely
    const originalExt = path.extname(originalFilename || "").toLowerCase();
    const fallbackExt =
      mimeType === "image/png"
        ? ".png"
        : mimeType === "image/webp"
        ? ".webp"
        : mimeType === "image/gif"
        ? ".gif"
        : mimeType === "image/svg+xml"
        ? ".svg"
        : ".jpg";
    const ext = originalExt && originalExt.length <= 5 ? originalExt : fallbackExt;

    // Sanitize base filename and append random entropy to guarantee collision resistance
    const rawBase = path.basename(originalFilename || "upload", originalExt);
    const cleanBase =
      rawBase.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32) || "media";
    const randomSuffix = crypto.randomBytes(4).toString("hex");
    const safeFileName = `${cleanBase}_${randomSuffix}${ext}`;

    // Scope storage by sanitized user id to maintain isolation
    const safeUserId = String(userId || "anonymous").replace(/[^a-zA-Z0-9_-]/g, "_");
    const folder = `/website-builder/${safeUserId}`;

    const uploadResponse = await getImageKit().files.upload({
      file: fileBuffer.toString("base64"),
      fileName: safeFileName,
      folder: folder,
      useUniqueFileName: true,
      tags: ["website-builder", safeUserId],
    });

    return {
      url: uploadResponse.url,
      providerId: uploadResponse.fileId,
      width: uploadResponse.width || null,
      height: uploadResponse.height || null,
      mimeType: uploadResponse.mime || mimeType,
      filename: uploadResponse.name || safeFileName,
      provider: "imagekit",
    };
  }

  async delete(providerId) {
    if (!providerId) return;
    try {
      await getImageKit().files.delete(providerId);
    } catch (error) {
      console.error(`[ImageKit] Failed to delete fileId '${providerId}':`, error.message || error);
      throw error;
    }
  }
}

/**
 * Legacy Cloudinary Storage fallback for existing records
 */
class CloudinaryMediaStorage {
  constructor() {
    this.cloudinary = null;
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        const cloudinary = require("cloudinary").v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });
        this.cloudinary = cloudinary;
      } catch (e) {
        // Cloudinary optional
      }
    }
  }

  async upload(fileBuffer, mimeType, userId) {
    if (!this.cloudinary) throw new Error("Cloudinary not configured");
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        {
          folder: `website-builder/${userId}`,
          resource_type: "image",
        },
        (error, result) => {
          if (error) return reject(error);
          resolve({
            url: result.secure_url,
            providerId: result.public_id,
            width: result.width,
            height: result.height,
            mimeType: result.format ? `image/${result.format}` : mimeType,
            provider: "cloudinary",
          });
        }
      );
      uploadStream.end(fileBuffer);
    });
  }

  async delete(providerId) {
    if (!this.cloudinary || !providerId) return;
    return new Promise((resolve, reject) => {
      this.cloudinary.uploader.destroy(providerId, (error, result) => {
        if (error) return reject(error);
        resolve(result);
      });
    });
  }
}

/**
 * Storage Service Manager
 * Defaults to ImageKitMediaStorage while supporting deletion of legacy Cloudinary assets.
 */
class MediaStorage {
  constructor(defaultProvider, fallbackProviders = {}) {
    this.provider = defaultProvider;
    this.fallbackProviders = fallbackProviders;
  }

  async upload(fileBuffer, mimeType, userId, originalFilename) {
    return this.provider.upload(fileBuffer, mimeType, userId, originalFilename);
  }

  async delete(providerId, providerName = "imagekit") {
    if (providerName && this.fallbackProviders[providerName]) {
      return this.fallbackProviders[providerName].delete(providerId);
    }
    return this.provider.delete(providerId);
  }
}

const storageService = new MediaStorage(new ImageKitMediaStorage(), {
  cloudinary: new CloudinaryMediaStorage(),
});

module.exports = storageService;
