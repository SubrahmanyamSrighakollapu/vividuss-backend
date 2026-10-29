-- AlterTable
ALTER TABLE "Template" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "globalLayout" JSONB,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "theme" JSONB;

-- AlterTable
ALTER TABLE "TemplatePage" ADD COLUMN     "editorData" JSONB,
ADD COLUMN     "responsive" JSONB;

-- AlterTable
ALTER TABLE "Website" ADD COLUMN     "theme" JSONB;

-- AlterTable
ALTER TABLE "WebsitePage" ADD COLUMN     "editorData" JSONB,
ADD COLUMN     "responsive" JSONB;

-- CreateTable
CREATE TABLE "WebsiteCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "thumbnail" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "alt" TEXT,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "provider" TEXT NOT NULL DEFAULT 'url',
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteCategory_slug_key" ON "WebsiteCategory"("slug");

-- CreateIndex
CREATE INDEX "WebsiteCategory_isActive_sortOrder_idx" ON "WebsiteCategory"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "MediaAsset_userId_idx" ON "MediaAsset"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Template_slug_key" ON "Template"("slug");

-- CreateIndex
CREATE INDEX "Template_categoryId_idx" ON "Template"("categoryId");

-- CreateIndex
CREATE INDEX "Template_status_updatedAt_idx" ON "Template"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "WebsiteCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
