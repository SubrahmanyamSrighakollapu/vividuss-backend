const { PrismaClient } = require("@prisma/client");
const storageService = require("./storage.service");
const prisma = new PrismaClient();

const getMediaAssets = async (userId, options = {}) => {
  const where = { userId };

  if (options.search && typeof options.search === "string" && options.search.trim()) {
    const term = options.search.trim();
    where.OR = [
      { filename: { contains: term, mode: "insensitive" } },
      { alt: { contains: term, mode: "insensitive" } },
    ];
  }

  const query = {
    where,
    orderBy: { createdAt: "desc" },
  };

  if (options.limit && !isNaN(Number(options.limit))) {
    const limitNum = Math.max(1, Math.min(100, Number(options.limit)));
    query.take = limitNum;
    if (options.page && !isNaN(Number(options.page))) {
      const pageNum = Math.max(1, Number(options.page));
      query.skip = (pageNum - 1) * limitNum;
    }
  }

  return await prisma.mediaAsset.findMany(query);
};

const getMediaAssetById = async (id, userId) => {
  return await prisma.mediaAsset.findFirst({
    where: { id, userId },
  });
};

const createMediaAsset = async (userId, data) => {
  return await prisma.mediaAsset.create({
    data: {
      userId,
      url: data.url,
      filename: data.filename || "Untitled",
      alt: data.alt || null,
      mimeType: data.mimeType || null,
      width: data.width || null,
      height: data.height || null,
      provider: data.provider || "url",
      providerId: data.providerId || null,
    },
  });
};

const updateMediaAsset = async (id, userId, data) => {
  const asset = await getMediaAssetById(id, userId);
  if (!asset) throw new Error("Media asset not found");

  return await prisma.mediaAsset.update({
    where: { id },
    data,
  });
};

const deleteMediaAsset = async (id, userId) => {
  const asset = await getMediaAssetById(id, userId);
  if (!asset) throw new Error("Media asset not found");

  // If this asset was uploaded via a storage provider, delete it from the provider first
  if (asset.provider !== "url" && asset.providerId) {
    try {
      await storageService.delete(asset.providerId, asset.provider);
    } catch (error) {
      console.error(
        `[MediaService] Failed to delete provider file '${asset.providerId}':`,
        error.message || error
      );
      // We log and continue to allow DB record cleanup, preventing stale un-deletable DB rows
    }
  }

  // Delete the database record
  return await prisma.mediaAsset.delete({
    where: { id },
  });
};

module.exports = {
  getMediaAssets,
  getMediaAssetById,
  createMediaAsset,
  updateMediaAsset,
  deleteMediaAsset,
};
