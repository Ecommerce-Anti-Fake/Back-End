-- CreateTable
CREATE TABLE IF NOT EXISTS "shop_type" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_type_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "verification_requirement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "multiple_files_allowed" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_requirement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "shop_type_requirement" (
    "id" TEXT NOT NULL,
    "shop_type_id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "shop_type_requirement_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "shop" ADD COLUMN IF NOT EXISTS "shop_type_id" TEXT;
ALTER TABLE "shop_document" ADD COLUMN IF NOT EXISTS "requirement_id" TEXT;

-- CreateIndex before using ON CONFLICT.
CREATE UNIQUE INDEX IF NOT EXISTS "shop_type_code_key" ON "shop_type"("code");
CREATE INDEX IF NOT EXISTS "shop_type_is_active_sort_order_idx" ON "shop_type"("is_active", "sort_order");
CREATE UNIQUE INDEX IF NOT EXISTS "verification_requirement_code_key" ON "verification_requirement"("code");
CREATE INDEX IF NOT EXISTS "verification_requirement_is_active_idx" ON "verification_requirement"("is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "shop_type_requirement_shop_type_id_requirement_id_key" ON "shop_type_requirement"("shop_type_id", "requirement_id");
CREATE INDEX IF NOT EXISTS "shop_type_requirement_requirement_id_idx" ON "shop_type_requirement"("requirement_id");
CREATE INDEX IF NOT EXISTS "shop_type_requirement_is_active_sort_order_idx" ON "shop_type_requirement"("is_active", "sort_order");
CREATE INDEX IF NOT EXISTS "shop_shop_type_id_idx" ON "shop"("shop_type_id");
CREATE INDEX IF NOT EXISTS "shop_document_requirement_id_idx" ON "shop_document"("requirement_id");

-- Seed configurable shop types.
INSERT INTO "shop_type" ("id", "code", "name", "description", "sort_order")
VALUES
  ('shop-type-normal', 'NORMAL', 'Shop thuong', 'Ban le thong thuong tren san.', 10),
  ('shop-type-handmade', 'HANDMADE', 'Shop thu cong', 'Ban san pham tu lam hoac san pham thu cong.', 20),
  ('shop-type-manufacturer', 'MANUFACTURER', 'Nha san xuat', 'San xuat, ban si/le va co the mo kenh phan phoi.', 30),
  ('shop-type-distributor', 'DISTRIBUTOR', 'Dai ly phan phoi', 'Mua si, phan phoi hoac ban lai hang hoa duoc uy quyen.', 40)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = true;

-- Seed reusable verification requirements.
INSERT INTO "verification_requirement" ("id", "code", "name", "description", "multiple_files_allowed")
VALUES
  ('req-business-license', 'BUSINESS_LICENSE', 'Giay phep kinh doanh', 'Anh hoac ban scan giay phep kinh doanh/ho kinh doanh con hieu luc.', true),
  ('req-tax-registration', 'TAX_REGISTRATION', 'Giay dang ky thue', 'Tai lieu chung minh ma so thue hoac thong tin dang ky thue.', true),
  ('req-manufacturing-certificate', 'MANUFACTURING_CERTIFICATE', 'Giay chung minh co so san xuat', 'Giay chung nhan du dieu kien san xuat, anh co so hoac tai lieu tuong duong.', true),
  ('req-distribution-license', 'DISTRIBUTION_LICENSE', 'Giay phep phan phoi', 'Giay uy quyen, hop dong phan phoi hoac tai lieu chung minh quyen phan phoi.', true),
  ('req-handmade-proof', 'HANDMADE_PROOF', 'Bang chung san pham thu cong', 'Anh quy trinh san xuat, cam ket san pham thu cong hoac tai lieu lien quan.', true)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "multiple_files_allowed" = EXCLUDED."multiple_files_allowed",
  "is_active" = true;

-- Seed mapping between shop types and requirements.
INSERT INTO "shop_type_requirement" ("id", "shop_type_id", "requirement_id", "required", "sort_order")
VALUES
  ('str-handmade-proof', 'shop-type-handmade', 'req-handmade-proof', true, 10),
  ('str-manufacturer-business-license', 'shop-type-manufacturer', 'req-business-license', true, 10),
  ('str-manufacturer-tax-registration', 'shop-type-manufacturer', 'req-tax-registration', true, 20),
  ('str-manufacturer-certificate', 'shop-type-manufacturer', 'req-manufacturing-certificate', true, 30),
  ('str-distributor-business-license', 'shop-type-distributor', 'req-business-license', true, 10),
  ('str-distributor-tax-registration', 'shop-type-distributor', 'req-tax-registration', false, 20),
  ('str-distributor-license', 'shop-type-distributor', 'req-distribution-license', true, 30)
ON CONFLICT ("shop_type_id", "requirement_id") DO UPDATE SET
  "required" = EXCLUDED."required",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = true;

-- Backfill existing shops and shop documents.
UPDATE "shop"
SET "shop_type_id" = CASE "registration_type"
  WHEN 'NORMAL' THEN 'shop-type-normal'
  WHEN 'HANDMADE' THEN 'shop-type-handmade'
  WHEN 'MANUFACTURER' THEN 'shop-type-manufacturer'
  WHEN 'DISTRIBUTOR' THEN 'shop-type-distributor'
  ELSE NULL
END
WHERE "shop_type_id" IS NULL;

UPDATE "shop_document"
SET "requirement_id" = (
  SELECT "id"
  FROM "verification_requirement"
  WHERE "verification_requirement"."code" = "shop_document"."doc_type"
  LIMIT 1
)
WHERE "requirement_id" IS NULL;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shop_shop_type_id_fkey') THEN
    ALTER TABLE "shop"
    ADD CONSTRAINT "shop_shop_type_id_fkey"
    FOREIGN KEY ("shop_type_id") REFERENCES "shop_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shop_type_requirement_shop_type_id_fkey') THEN
    ALTER TABLE "shop_type_requirement"
    ADD CONSTRAINT "shop_type_requirement_shop_type_id_fkey"
    FOREIGN KEY ("shop_type_id") REFERENCES "shop_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shop_type_requirement_requirement_id_fkey') THEN
    ALTER TABLE "shop_type_requirement"
    ADD CONSTRAINT "shop_type_requirement_requirement_id_fkey"
    FOREIGN KEY ("requirement_id") REFERENCES "verification_requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shop_document_requirement_id_fkey') THEN
    ALTER TABLE "shop_document"
    ADD CONSTRAINT "shop_document_requirement_id_fkey"
    FOREIGN KEY ("requirement_id") REFERENCES "verification_requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
