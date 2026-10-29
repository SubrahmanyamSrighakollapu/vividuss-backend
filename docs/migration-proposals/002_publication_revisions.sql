-- CreateTable
CREATE TABLE "WebsitePublicationState" (
    "websiteId" TEXT NOT NULL,
    "draftVersion" INTEGER NOT NULL DEFAULT 0,
    "publicationVersion" INTEGER NOT NULL DEFAULT 0,
    "activeRevisionId" TEXT,
    "publishedSlug" TEXT,
    "globalLayout" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsitePublicationState_pkey" PRIMARY KEY ("websiteId")
);

-- CreateTable
CREATE TABLE "WebsiteRevision" (
    "id" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "snapshotHash" VARCHAR(64) NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PUBLISH',
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restoredFromRevisionId" TEXT,

    CONSTRAINT "WebsiteRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WebsitePublicationState_publishedSlug_key" ON "WebsitePublicationState"("publishedSlug");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteRevision_websiteId_sequence_key" ON "WebsiteRevision"("websiteId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteRevision_websiteId_id_key" ON "WebsiteRevision"("websiteId", "id");

-- AddForeignKey
ALTER TABLE "WebsitePublicationState" ADD CONSTRAINT "WebsitePublicationState_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsitePublicationState" ADD CONSTRAINT "WebsitePublicationState_websiteId_activeRevisionId_fkey" FOREIGN KEY ("websiteId", "activeRevisionId") REFERENCES "WebsiteRevision"("websiteId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "WebsiteRevision" ADD CONSTRAINT "WebsiteRevision_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteRevision" ADD CONSTRAINT "WebsiteRevision_websiteId_restoredFromRevisionId_fkey" FOREIGN KEY ("websiteId", "restoredFromRevisionId") REFERENCES "WebsiteRevision"("websiteId", "id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Integrity rules beyond the Prisma structural schema.
ALTER TABLE "WebsitePublicationState" ADD CONSTRAINT "publication_versions_nonnegative" CHECK ("draftVersion" >= 0 AND "publicationVersion" >= 0);
ALTER TABLE "WebsitePublicationState" ADD CONSTRAINT "publication_pointer_consistent" CHECK (("activeRevisionId" IS NULL) = ("publicationVersion" = 0) AND ("activeRevisionId" IS NULL) = ("publishedSlug" IS NULL));
ALTER TABLE "WebsiteRevision" ADD CONSTRAINT "revision_sequence_positive" CHECK ("sequence" > 0);
CREATE FUNCTION vividuss_reject_revision_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Published revision content is immutable' USING ERRCODE = '23000'; END $$;
CREATE TRIGGER vividuss_revision_immutable BEFORE UPDATE OR DELETE ON "WebsiteRevision" FOR EACH ROW EXECUTE FUNCTION vividuss_reject_revision_mutation();
CREATE TRIGGER vividuss_revision_no_truncate BEFORE TRUNCATE ON "WebsiteRevision" FOR EACH STATEMENT EXECUTE FUNCTION vividuss_reject_revision_mutation();
