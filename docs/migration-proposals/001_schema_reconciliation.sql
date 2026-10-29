-- REVIEW ONLY. NOT registered for Prisma deployment. Existing database identity,
-- schema drift and migration history must be inspected before approval.
-- Intended source: the three committed historical migrations replayed on EMPTY DB.
-- Does not modify JSON, ownership, sections, or published snapshots.
CREATE TABLE "WebsiteCategory" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "description" TEXT, "icon" TEXT, "thumbnail" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsiteCategory_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WebsiteCategory_slug_key" ON "WebsiteCategory"("slug");
CREATE INDEX "WebsiteCategory_isActive_sortOrder_idx" ON "WebsiteCategory"("isActive", "sortOrder");
ALTER TABLE "Template" ADD COLUMN "slug" TEXT,
  ADD COLUMN "globalLayout" JSONB, ADD COLUMN "categoryId" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN "publishedAt" TIMESTAMP(3), ADD COLUMN "theme" JSONB;
CREATE UNIQUE INDEX "Template_slug_key" ON "Template"("slug");
CREATE INDEX "Template_categoryId_idx" ON "Template"("categoryId");
CREATE INDEX "Template_status_updatedAt_idx" ON "Template"("status", "updatedAt");
ALTER TABLE "Template" ADD CONSTRAINT "Template_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "WebsiteCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Website" ADD COLUMN "theme" JSONB;
ALTER TABLE "TemplatePage" ADD COLUMN "editorData" JSONB, ADD COLUMN "responsive" JSONB;
ALTER TABLE "WebsitePage" ADD COLUMN "editorData" JSONB, ADD COLUMN "responsive" JSONB;
CREATE TABLE "MediaAsset" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "url" TEXT NOT NULL,
  "filename" TEXT NOT NULL, "alt" TEXT, "mimeType" TEXT,
  "width" INTEGER, "height" INTEGER, "provider" TEXT NOT NULL DEFAULT 'url', "providerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MediaAsset_userId_idx" ON "MediaAsset"("userId");
