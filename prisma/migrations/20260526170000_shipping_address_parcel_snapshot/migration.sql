ALTER TABLE "offer"
ADD COLUMN "parcel_weight_grams" INTEGER,
ADD COLUMN "parcel_length_cm" INTEGER,
ADD COLUMN "parcel_width_cm" INTEGER,
ADD COLUMN "parcel_height_cm" INTEGER;

ALTER TABLE "order"
ADD COLUMN "shipping_district_id" INTEGER,
ADD COLUMN "shipping_district_name" TEXT,
ADD COLUMN "shipping_ward_code" TEXT,
ADD COLUMN "shipping_ward_name" TEXT,
ADD COLUMN "shipping_service_id" INTEGER,
ADD COLUMN "shipping_service_type_id" INTEGER,
ADD COLUMN "parcel_weight_grams" INTEGER,
ADD COLUMN "parcel_length_cm" INTEGER,
ADD COLUMN "parcel_width_cm" INTEGER,
ADD COLUMN "parcel_height_cm" INTEGER;
