-- AlterTable
ALTER TABLE "Website" ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "publishedAt" TIMESTAMP(3),
ADD COLUMN "publishedData" JSONB;
