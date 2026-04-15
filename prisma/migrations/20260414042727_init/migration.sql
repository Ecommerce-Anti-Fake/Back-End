/*
  Warnings:

  - Added the required column `registration_type` to the `shop` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DistributionNodeType" AS ENUM ('MANUFACTURER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3');

-- CreateEnum
CREATE TYPE "DistributionRelationshipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "DistributionShipmentStatus" AS ENUM ('DRAFT', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "AffiliateScopeType" AS ENUM ('PLATFORM', 'SHOP', 'BRAND', 'PRODUCT_MODEL', 'OFFER');

-- CreateEnum
CREATE TYPE "AffiliateProgramStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AffiliateAccountStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "AffiliateConversionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AffiliateCommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'LOCKED', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommissionBeneficiaryType" AS ENUM ('AFFILIATE_TIER_1', 'AFFILIATE_TIER_2', 'PLATFORM', 'SHOP');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShopRegistrationType" AS ENUM ('MANUFACTURER', 'AGENT');

-- CreateEnum
CREATE TYPE "OfferSalesMode" AS ENUM ('RETAIL', 'WHOLESALE', 'BOTH');

-- AlterTable
ALTER TABLE "offer" ADD COLUMN     "distribution_node_id" TEXT,
ADD COLUMN     "min_wholesale_qty" INTEGER,
ADD COLUMN     "sales_mode" "OfferSalesMode" NOT NULL DEFAULT 'RETAIL';

-- AlterTable
ALTER TABLE "shop" ADD COLUMN     "registration_type" "ShopRegistrationType" NOT NULL;

-- AlterTable
ALTER TABLE "supply_batch" ADD COLUMN     "distribution_node_id" TEXT;

-- CreateTable
CREATE TABLE "distribution_network" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "manufacturer_shop_id" TEXT NOT NULL,
    "network_name" TEXT NOT NULL,
    "network_status" TEXT NOT NULL DEFAULT 'active',
    "max_agent_depth" INTEGER NOT NULL DEFAULT 3,
    "rules_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_network_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_node" (
    "id" TEXT NOT NULL,
    "network_id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "parent_node_id" TEXT,
    "level" INTEGER NOT NULL,
    "node_type" "DistributionNodeType" NOT NULL,
    "relationship_status" "DistributionRelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "contract_code" TEXT,
    "lineage_code" TEXT,
    "territory_code" TEXT,
    "activated_at" TIMESTAMP(3),
    "terminated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_shipment" (
    "id" TEXT NOT NULL,
    "network_id" TEXT NOT NULL,
    "from_node_id" TEXT NOT NULL,
    "to_node_id" TEXT NOT NULL,
    "shipment_code" TEXT NOT NULL,
    "shipment_status" "DistributionShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "shipped_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_shipment_item" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "product_model_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(18,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distribution_shipment_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_program" (
    "id" TEXT NOT NULL,
    "owner_shop_id" TEXT,
    "brand_id" TEXT,
    "product_model_id" TEXT,
    "offer_id" TEXT,
    "scope_type" "AffiliateScopeType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "program_status" "AffiliateProgramStatus" NOT NULL DEFAULT 'DRAFT',
    "attribution_window_days" INTEGER NOT NULL DEFAULT 30,
    "commission_model" TEXT NOT NULL DEFAULT 'revenue_share',
    "tier1_rate" DECIMAL(5,2) NOT NULL,
    "tier2_rate" DECIMAL(5,2) NOT NULL,
    "rules_json" JSONB,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_account" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "parent_account_id" TEXT,
    "account_status" "AffiliateAccountStatus" NOT NULL DEFAULT 'PENDING',
    "referral_path" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_code" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "landing_url" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_code_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_conversion" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "order_id" TEXT,
    "offer_id" TEXT,
    "affiliate_code_id" TEXT,
    "tier1_account_id" TEXT NOT NULL,
    "tier2_account_id" TEXT,
    "customer_user_id" TEXT,
    "conversion_status" "AffiliateConversionStatus" NOT NULL DEFAULT 'PENDING',
    "order_amount" DECIMAL(18,2),
    "commission_base" DECIMAL(18,2),
    "metadata" JSONB,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "affiliate_conversion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_commission_ledger" (
    "id" TEXT NOT NULL,
    "conversion_id" TEXT NOT NULL,
    "beneficiary_account_id" TEXT,
    "beneficiary_type" "CommissionBeneficiaryType" NOT NULL,
    "tier_level" INTEGER,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "commission_status" "AffiliateCommissionStatus" NOT NULL DEFAULT 'PENDING',
    "locked_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "payout_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_commission_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_payout" (
    "id" TEXT NOT NULL,
    "program_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "payout_status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "external_ref" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "affiliate_payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "distribution_network_brand_id_manufacturer_shop_id_key" ON "distribution_network"("brand_id", "manufacturer_shop_id");

-- CreateIndex
CREATE INDEX "distribution_node_parent_node_id_idx" ON "distribution_node"("parent_node_id");

-- CreateIndex
CREATE INDEX "distribution_node_network_id_level_idx" ON "distribution_node"("network_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_node_network_id_shop_id_key" ON "distribution_node"("network_id", "shop_id");

-- CreateIndex
CREATE INDEX "distribution_shipment_from_node_id_idx" ON "distribution_shipment"("from_node_id");

-- CreateIndex
CREATE INDEX "distribution_shipment_to_node_id_idx" ON "distribution_shipment"("to_node_id");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_shipment_network_id_shipment_code_key" ON "distribution_shipment"("network_id", "shipment_code");

-- CreateIndex
CREATE INDEX "distribution_shipment_item_batch_id_idx" ON "distribution_shipment_item"("batch_id");

-- CreateIndex
CREATE INDEX "distribution_shipment_item_product_model_id_idx" ON "distribution_shipment_item"("product_model_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_program_slug_key" ON "affiliate_program"("slug");

-- CreateIndex
CREATE INDEX "affiliate_program_owner_shop_id_idx" ON "affiliate_program"("owner_shop_id");

-- CreateIndex
CREATE INDEX "affiliate_program_brand_id_idx" ON "affiliate_program"("brand_id");

-- CreateIndex
CREATE INDEX "affiliate_program_product_model_id_idx" ON "affiliate_program"("product_model_id");

-- CreateIndex
CREATE INDEX "affiliate_program_offer_id_idx" ON "affiliate_program"("offer_id");

-- CreateIndex
CREATE INDEX "affiliate_account_parent_account_id_idx" ON "affiliate_account"("parent_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_account_program_id_user_id_key" ON "affiliate_account"("program_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_code_code_key" ON "affiliate_code"("code");

-- CreateIndex
CREATE INDEX "affiliate_code_program_id_idx" ON "affiliate_code"("program_id");

-- CreateIndex
CREATE INDEX "affiliate_code_account_id_idx" ON "affiliate_code"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_conversion_order_id_key" ON "affiliate_conversion"("order_id");

-- CreateIndex
CREATE INDEX "affiliate_conversion_program_id_idx" ON "affiliate_conversion"("program_id");

-- CreateIndex
CREATE INDEX "affiliate_conversion_offer_id_idx" ON "affiliate_conversion"("offer_id");

-- CreateIndex
CREATE INDEX "affiliate_conversion_affiliate_code_id_idx" ON "affiliate_conversion"("affiliate_code_id");

-- CreateIndex
CREATE INDEX "affiliate_conversion_tier1_account_id_idx" ON "affiliate_conversion"("tier1_account_id");

-- CreateIndex
CREATE INDEX "affiliate_conversion_tier2_account_id_idx" ON "affiliate_conversion"("tier2_account_id");

-- CreateIndex
CREATE INDEX "affiliate_conversion_customer_user_id_idx" ON "affiliate_conversion"("customer_user_id");

-- CreateIndex
CREATE INDEX "affiliate_commission_ledger_conversion_id_idx" ON "affiliate_commission_ledger"("conversion_id");

-- CreateIndex
CREATE INDEX "affiliate_commission_ledger_beneficiary_account_id_idx" ON "affiliate_commission_ledger"("beneficiary_account_id");

-- CreateIndex
CREATE INDEX "affiliate_commission_ledger_payout_id_idx" ON "affiliate_commission_ledger"("payout_id");

-- CreateIndex
CREATE INDEX "affiliate_payout_program_id_idx" ON "affiliate_payout"("program_id");

-- CreateIndex
CREATE INDEX "affiliate_payout_account_id_idx" ON "affiliate_payout"("account_id");

-- CreateIndex
CREATE INDEX "offer_distribution_node_id_idx" ON "offer"("distribution_node_id");

-- CreateIndex
CREATE INDEX "supply_batch_distribution_node_id_idx" ON "supply_batch"("distribution_node_id");

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_distribution_node_id_fkey" FOREIGN KEY ("distribution_node_id") REFERENCES "distribution_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_batch" ADD CONSTRAINT "supply_batch_distribution_node_id_fkey" FOREIGN KEY ("distribution_node_id") REFERENCES "distribution_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_network" ADD CONSTRAINT "distribution_network_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_network" ADD CONSTRAINT "distribution_network_manufacturer_shop_id_fkey" FOREIGN KEY ("manufacturer_shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_node" ADD CONSTRAINT "distribution_node_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "distribution_network"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_node" ADD CONSTRAINT "distribution_node_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_node" ADD CONSTRAINT "distribution_node_parent_node_id_fkey" FOREIGN KEY ("parent_node_id") REFERENCES "distribution_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_shipment" ADD CONSTRAINT "distribution_shipment_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "distribution_network"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_shipment" ADD CONSTRAINT "distribution_shipment_from_node_id_fkey" FOREIGN KEY ("from_node_id") REFERENCES "distribution_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_shipment" ADD CONSTRAINT "distribution_shipment_to_node_id_fkey" FOREIGN KEY ("to_node_id") REFERENCES "distribution_node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_shipment_item" ADD CONSTRAINT "distribution_shipment_item_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "distribution_shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_shipment_item" ADD CONSTRAINT "distribution_shipment_item_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "supply_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_shipment_item" ADD CONSTRAINT "distribution_shipment_item_product_model_id_fkey" FOREIGN KEY ("product_model_id") REFERENCES "product_model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_program" ADD CONSTRAINT "affiliate_program_owner_shop_id_fkey" FOREIGN KEY ("owner_shop_id") REFERENCES "shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_program" ADD CONSTRAINT "affiliate_program_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_program" ADD CONSTRAINT "affiliate_program_product_model_id_fkey" FOREIGN KEY ("product_model_id") REFERENCES "product_model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_program" ADD CONSTRAINT "affiliate_program_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_account" ADD CONSTRAINT "affiliate_account_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "affiliate_program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_account" ADD CONSTRAINT "affiliate_account_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_account" ADD CONSTRAINT "affiliate_account_parent_account_id_fkey" FOREIGN KEY ("parent_account_id") REFERENCES "affiliate_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_code" ADD CONSTRAINT "affiliate_code_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "affiliate_program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_code" ADD CONSTRAINT "affiliate_code_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "affiliate_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_conversion" ADD CONSTRAINT "affiliate_conversion_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "affiliate_program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_conversion" ADD CONSTRAINT "affiliate_conversion_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_conversion" ADD CONSTRAINT "affiliate_conversion_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_conversion" ADD CONSTRAINT "affiliate_conversion_affiliate_code_id_fkey" FOREIGN KEY ("affiliate_code_id") REFERENCES "affiliate_code"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_conversion" ADD CONSTRAINT "affiliate_conversion_tier1_account_id_fkey" FOREIGN KEY ("tier1_account_id") REFERENCES "affiliate_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_conversion" ADD CONSTRAINT "affiliate_conversion_tier2_account_id_fkey" FOREIGN KEY ("tier2_account_id") REFERENCES "affiliate_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_conversion" ADD CONSTRAINT "affiliate_conversion_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commission_ledger" ADD CONSTRAINT "affiliate_commission_ledger_conversion_id_fkey" FOREIGN KEY ("conversion_id") REFERENCES "affiliate_conversion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commission_ledger" ADD CONSTRAINT "affiliate_commission_ledger_beneficiary_account_id_fkey" FOREIGN KEY ("beneficiary_account_id") REFERENCES "affiliate_account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_commission_ledger" ADD CONSTRAINT "affiliate_commission_ledger_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "affiliate_payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_payout" ADD CONSTRAINT "affiliate_payout_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "affiliate_program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_payout" ADD CONSTRAINT "affiliate_payout_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "affiliate_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
