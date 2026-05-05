-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DistributionNodeType" AS ENUM ('MANUFACTURER', 'AGENT_LEVEL_1', 'AGENT_LEVEL_2', 'AGENT_LEVEL_3');

-- CreateEnum
CREATE TYPE "DistributionRelationshipStatus" AS ENUM ('INVITED', 'DECLINED', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED');

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
CREATE TYPE "ShopRegistrationType" AS ENUM ('NORMAL', 'HANDMADE', 'MANUFACTURER', 'DISTRIBUTOR');

-- CreateEnum
CREATE TYPE "OfferSalesMode" AS ENUM ('RETAIL', 'WHOLESALE', 'BOTH');

-- CreateEnum
CREATE TYPE "DistributionDiscountType" AS ENUM ('PERCENT', 'FIXED_AMOUNT', 'FIXED_PRICE');

-- CreateEnum
CREATE TYPE "DistributionPricingScope" AS ENUM ('NETWORK_DEFAULT', 'NODE_LEVEL', 'NODE_SPECIFIC');

-- CreateEnum
CREATE TYPE "OrderMode" AS ENUM ('RETAIL', 'WHOLESALE');

-- CreateEnum
CREATE TYPE "MediaProvider" AS ENUM ('CLOUDINARY');

-- CreateEnum
CREATE TYPE "MediaAssetType" AS ENUM ('IMAGE', 'VIDEO', 'RAW');

-- CreateEnum
CREATE TYPE "MediaResourceType" AS ENUM ('DISPUTE_EVIDENCE', 'KYC_DOCUMENT', 'SHOP_DOCUMENT', 'PRODUCT_IMAGE', 'OFFER_DOCUMENT', 'BATCH_DOCUMENT');

-- CreateEnum
CREATE TYPE "KycDocumentSide" AS ENUM ('FRONT', 'BACK');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "display_name" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "account_status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_address" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_line" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_asset" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "provider" "MediaProvider" NOT NULL,
    "asset_type" "MediaAssetType" NOT NULL,
    "resource_type" "MediaResourceType" NOT NULL,
    "public_id" TEXT,
    "secure_url" TEXT NOT NULL,
    "mime_type" TEXT,
    "folder" TEXT,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_session" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_family" TEXT NOT NULL,
    "current_token_id" TEXT NOT NULL,
    "current_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "reuse_detected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_kyc" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "kyc_level" TEXT NOT NULL,
    "id_type" TEXT NOT NULL,
    "id_number_hash" TEXT NOT NULL,
    "verification_status" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3),
    "review_note" TEXT,

    CONSTRAINT "user_kyc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_kyc_document" (
    "id" TEXT NOT NULL,
    "user_kyc_id" TEXT NOT NULL,
    "media_asset_id" TEXT NOT NULL,
    "side" "KycDocumentSide" NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_kyc_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_kyc_submission" (
    "id" TEXT NOT NULL,
    "user_kyc_id" TEXT NOT NULL,
    "submission_number" INTEGER NOT NULL,
    "verification_status" TEXT NOT NULL DEFAULT 'pending',
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_kyc_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_kyc_submission_document" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "media_asset_id" TEXT NOT NULL,
    "side" "KycDocumentSide" NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_kyc_submission_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop" (
    "id" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "shop_type_id" TEXT,
    "shop_name" TEXT NOT NULL,
    "registration_type" "ShopRegistrationType" NOT NULL,
    "business_type" TEXT NOT NULL,
    "tax_code" TEXT,
    "shop_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_type" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_requirement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "multiple_files_allowed" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_type_requirement" (
    "id" TEXT NOT NULL,
    "shop_type_id" TEXT NOT NULL,
    "requirement_id" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "shop_type_requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_business_category" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "registration_status" TEXT NOT NULL DEFAULT 'pending',
    "approved_at" TIMESTAMP(3),
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_business_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_category_document" (
    "id" TEXT NOT NULL,
    "shop_business_category_id" TEXT NOT NULL,
    "media_asset_id" TEXT,
    "document_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "document_number" TEXT,
    "issued_by" TEXT,
    "issued_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "review_status" TEXT NOT NULL DEFAULT 'pending',
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_category_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_document" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "requirement_id" TEXT,
    "doc_type" TEXT NOT NULL,
    "review_status" TEXT NOT NULL,
    "review_note" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_document_file" (
    "id" TEXT NOT NULL,
    "shop_document_id" TEXT NOT NULL,
    "media_asset_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_document_file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registry_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_authorization" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "media_asset_id" TEXT,
    "authorization_type" TEXT NOT NULL,
    "file_url" TEXT,
    "verification_status" TEXT NOT NULL,
    "review_note" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_authorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "risk_tier" TEXT NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_model" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "gtin" TEXT,
    "verification_policy" TEXT NOT NULL,
    "approval_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer" (
    "id" TEXT NOT NULL,
    "seller_user_id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "product_model_id" TEXT NOT NULL,
    "distribution_node_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "sales_mode" "OfferSalesMode" NOT NULL DEFAULT 'RETAIL',
    "min_wholesale_qty" INTEGER,
    "item_condition" TEXT NOT NULL,
    "available_quantity" INTEGER NOT NULL,
    "verification_level" TEXT NOT NULL,
    "offer_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_media" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "media_asset_id" TEXT,
    "media_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "phash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_document" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "media_asset_id" TEXT,
    "doc_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "issuer_name" TEXT,
    "document_number_hash" TEXT,
    "review_status" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supply_batch" (
    "id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "product_model_id" TEXT NOT NULL,
    "distribution_node_id" TEXT,
    "batch_number" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "source_name" TEXT NOT NULL,
    "country_of_origin" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supply_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_document" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "media_asset_id" TEXT,
    "doc_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "issuer_name" TEXT,
    "document_number_hash" TEXT,
    "review_status" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offer_batch_link" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "allocated_quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_batch_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_label" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "label_type" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "issuer_type" TEXT NOT NULL,
    "label_status" TEXT NOT NULL,
    "scope_type" TEXT NOT NULL,
    "scope_id" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_label_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provenance_event" (
    "id" TEXT NOT NULL,
    "label_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_user_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "context_type" TEXT NOT NULL,
    "context_id" TEXT NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provenance_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_score" (
    "id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "score" DECIMAL(5,2) NOT NULL,
    "risk_level" TEXT NOT NULL,
    "factor_summary" TEXT NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "risk_score_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart" (
    "id" TEXT NOT NULL,
    "buyer_user_id" TEXT NOT NULL,
    "cart_status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_item" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "offer_title_snapshot" TEXT NOT NULL,
    "unit_price_snapshot" DECIMAL(18,2) NOT NULL,
    "currency_snapshot" TEXT NOT NULL,
    "shop_name_snapshot" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL,
    "buyer_user_id" TEXT,
    "buyer_shop_id" TEXT,
    "buyer_distribution_node_id" TEXT,
    "shop_id" TEXT NOT NULL,
    "order_mode" "OrderMode" NOT NULL DEFAULT 'RETAIL',
    "order_type" TEXT NOT NULL,
    "order_status" TEXT NOT NULL,
    "fulfillment_status" TEXT NOT NULL DEFAULT 'PENDING',
    "base_amount" DECIMAL(18,2) NOT NULL,
    "discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "platform_fee_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "buyer_payable_amount" DECIMAL(18,2) NOT NULL,
    "seller_receivable_amount" DECIMAL(18,2) NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "shipping_name" TEXT,
    "shipping_phone" TEXT,
    "shipping_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "offer_title_snapshot" TEXT NOT NULL,
    "unit_price" DECIMAL(18,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "verification_level_snapshot" TEXT NOT NULL,

    CONSTRAINT "order_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_item_batch_allocation" (
    "id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_item_batch_allocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_intent" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "payment_method" TEXT NOT NULL,
    "payment_status" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "provider_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_intent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escrow" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "escrow_status" TEXT NOT NULL,
    "held_amount" DECIMAL(18,2) NOT NULL,
    "hold_at" TIMESTAMP(3),
    "release_at" TIMESTAMP(3),

    CONSTRAINT "escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "opened_by_user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "dispute_status" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_evidence" (
    "id" TEXT NOT NULL,
    "dispute_id" TEXT NOT NULL,
    "uploaded_by_user_id" TEXT NOT NULL,
    "media_asset_id" TEXT,
    "file_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispute_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "to_user_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_thread" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "buyer_user_id" TEXT NOT NULL,
    "seller_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_thread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_message" (
    "id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "sender_user_id" TEXT NOT NULL,
    "message_type" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report" (
    "id" TEXT NOT NULL,
    "reporter_user_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "report_status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "moderation_case" (
    "id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "case_status" TEXT NOT NULL,
    "internal_note" TEXT,
    "assigned_admin_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "moderation_case_pkey" PRIMARY KEY ("id")
);

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
CREATE TABLE "distribution_pricing_policy" (
    "id" TEXT NOT NULL,
    "network_id" TEXT NOT NULL,
    "node_id" TEXT,
    "applies_to_level" INTEGER,
    "product_model_id" TEXT,
    "category_id" TEXT,
    "scope" "DistributionPricingScope" NOT NULL,
    "discount_type" "DistributionDiscountType" NOT NULL,
    "discount_value" DECIMAL(18,2) NOT NULL,
    "min_quantity" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distribution_pricing_policy_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "user_phone_key" ON "user"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_address_user_id_idx" ON "user_address"("user_id");

-- CreateIndex
CREATE INDEX "user_address_user_id_is_default_idx" ON "user_address"("user_id", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "user_address_one_default_per_user_idx" ON "user_address"("user_id") WHERE "is_default" = true;

-- CreateIndex
CREATE INDEX "media_asset_owner_user_id_idx" ON "media_asset"("owner_user_id");

-- CreateIndex
CREATE INDEX "media_asset_resource_type_idx" ON "media_asset"("resource_type");

-- CreateIndex
CREATE INDEX "audit_log_target_type_target_id_created_at_idx" ON "audit_log"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_log_actor_user_id_idx" ON "audit_log"("actor_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_session_current_token_id_key" ON "auth_session"("current_token_id");

-- CreateIndex
CREATE INDEX "auth_session_user_id_idx" ON "auth_session"("user_id");

-- CreateIndex
CREATE INDEX "auth_session_token_family_idx" ON "auth_session"("token_family");

-- CreateIndex
CREATE UNIQUE INDEX "user_kyc_user_id_key" ON "user_kyc"("user_id");

-- CreateIndex
CREATE INDEX "user_kyc_document_user_kyc_id_idx" ON "user_kyc_document"("user_kyc_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_kyc_document_user_kyc_id_side_key" ON "user_kyc_document"("user_kyc_id", "side");

-- CreateIndex
CREATE UNIQUE INDEX "user_kyc_document_media_asset_id_key" ON "user_kyc_document"("media_asset_id");

-- CreateIndex
CREATE INDEX "user_kyc_submission_user_kyc_id_submitted_at_idx" ON "user_kyc_submission"("user_kyc_id", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_kyc_submission_user_kyc_id_submission_number_key" ON "user_kyc_submission"("user_kyc_id", "submission_number");

-- CreateIndex
CREATE UNIQUE INDEX "user_kyc_submission_document_media_asset_id_key" ON "user_kyc_submission_document"("media_asset_id");

-- CreateIndex
CREATE INDEX "user_kyc_submission_document_submission_id_idx" ON "user_kyc_submission_document"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_kyc_submission_document_submission_id_side_key" ON "user_kyc_submission_document"("submission_id", "side");

-- CreateIndex
CREATE INDEX "shop_shop_type_id_idx" ON "shop"("shop_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_type_code_key" ON "shop_type"("code");

-- CreateIndex
CREATE INDEX "shop_type_is_active_sort_order_idx" ON "shop_type"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "verification_requirement_code_key" ON "verification_requirement"("code");

-- CreateIndex
CREATE INDEX "verification_requirement_is_active_idx" ON "verification_requirement"("is_active");

-- CreateIndex
CREATE INDEX "shop_type_requirement_requirement_id_idx" ON "shop_type_requirement"("requirement_id");

-- CreateIndex
CREATE INDEX "shop_type_requirement_is_active_sort_order_idx" ON "shop_type_requirement"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "shop_type_requirement_shop_type_id_requirement_id_key" ON "shop_type_requirement"("shop_type_id", "requirement_id");

-- CreateIndex
CREATE INDEX "shop_business_category_shop_id_idx" ON "shop_business_category"("shop_id");

-- CreateIndex
CREATE INDEX "shop_business_category_category_id_idx" ON "shop_business_category"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_business_category_shop_id_category_id_key" ON "shop_business_category"("shop_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_category_document_media_asset_id_key" ON "shop_category_document"("media_asset_id");

-- CreateIndex
CREATE INDEX "shop_category_document_shop_business_category_id_idx" ON "shop_category_document"("shop_business_category_id");

-- CreateIndex
CREATE INDEX "shop_document_shop_id_idx" ON "shop_document"("shop_id");

-- CreateIndex
CREATE INDEX "shop_document_requirement_id_idx" ON "shop_document"("requirement_id");

-- CreateIndex
CREATE INDEX "shop_document_doc_type_idx" ON "shop_document"("doc_type");

-- CreateIndex
CREATE UNIQUE INDEX "shop_document_file_media_asset_id_key" ON "shop_document_file"("media_asset_id");

-- CreateIndex
CREATE INDEX "shop_document_file_shop_document_id_idx" ON "shop_document_file"("shop_document_id");

-- CreateIndex
CREATE UNIQUE INDEX "brand_authorization_media_asset_id_key" ON "brand_authorization"("media_asset_id");

-- CreateIndex
CREATE INDEX "brand_authorization_media_asset_id_idx" ON "brand_authorization"("media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "brand_authorization_shop_id_brand_id_key" ON "brand_authorization"("shop_id", "brand_id");

-- CreateIndex
CREATE INDEX "product_model_category_id_idx" ON "product_model"("category_id");

-- CreateIndex
CREATE INDEX "offer_distribution_node_id_idx" ON "offer"("distribution_node_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_media_media_asset_id_key" ON "offer_media"("media_asset_id");

-- CreateIndex
CREATE INDEX "offer_media_media_asset_id_idx" ON "offer_media"("media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_document_media_asset_id_key" ON "offer_document"("media_asset_id");

-- CreateIndex
CREATE INDEX "offer_document_media_asset_id_idx" ON "offer_document"("media_asset_id");

-- CreateIndex
CREATE INDEX "supply_batch_distribution_node_id_idx" ON "supply_batch"("distribution_node_id");

-- CreateIndex
CREATE UNIQUE INDEX "batch_document_media_asset_id_key" ON "batch_document"("media_asset_id");

-- CreateIndex
CREATE INDEX "batch_document_media_asset_id_idx" ON "batch_document"("media_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "offer_batch_link_offer_id_batch_id_key" ON "offer_batch_link"("offer_id", "batch_id");

-- CreateIndex
CREATE INDEX "cart_buyer_user_id_idx" ON "cart"("buyer_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_buyer_user_id_cart_status_key" ON "cart"("buyer_user_id", "cart_status");

-- CreateIndex
CREATE INDEX "cart_item_cart_id_idx" ON "cart_item"("cart_id");

-- CreateIndex
CREATE INDEX "cart_item_offer_id_idx" ON "cart_item"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_item_cart_id_offer_id_key" ON "cart_item"("cart_id", "offer_id");

-- CreateIndex
CREATE INDEX "order_buyer_user_id_idx" ON "order"("buyer_user_id");

-- CreateIndex
CREATE INDEX "order_buyer_shop_id_idx" ON "order"("buyer_shop_id");

-- CreateIndex
CREATE INDEX "order_buyer_distribution_node_id_idx" ON "order"("buyer_distribution_node_id");

-- CreateIndex
CREATE INDEX "order_item_batch_allocation_batch_id_idx" ON "order_item_batch_allocation"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_intent_order_id_key" ON "payment_intent"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "escrow_order_id_key" ON "escrow"("order_id");

-- CreateIndex
CREATE INDEX "dispute_evidence_media_asset_id_idx" ON "dispute_evidence"("media_asset_id");

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
CREATE INDEX "distribution_pricing_policy_network_id_is_active_idx" ON "distribution_pricing_policy"("network_id", "is_active");

-- CreateIndex
CREATE INDEX "distribution_pricing_policy_node_id_idx" ON "distribution_pricing_policy"("node_id");

-- CreateIndex
CREATE INDEX "distribution_pricing_policy_applies_to_level_idx" ON "distribution_pricing_policy"("applies_to_level");

-- CreateIndex
CREATE INDEX "distribution_pricing_policy_product_model_id_idx" ON "distribution_pricing_policy"("product_model_id");

-- CreateIndex
CREATE INDEX "distribution_pricing_policy_category_id_idx" ON "distribution_pricing_policy"("category_id");

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

-- AddForeignKey
ALTER TABLE "user_address" ADD CONSTRAINT "user_address_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_kyc" ADD CONSTRAINT "user_kyc_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_kyc_document" ADD CONSTRAINT "user_kyc_document_user_kyc_id_fkey" FOREIGN KEY ("user_kyc_id") REFERENCES "user_kyc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_kyc_document" ADD CONSTRAINT "user_kyc_document_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_kyc_submission" ADD CONSTRAINT "user_kyc_submission_user_kyc_id_fkey" FOREIGN KEY ("user_kyc_id") REFERENCES "user_kyc"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_kyc_submission_document" ADD CONSTRAINT "user_kyc_submission_document_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "user_kyc_submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_kyc_submission_document" ADD CONSTRAINT "user_kyc_submission_document_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop" ADD CONSTRAINT "shop_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop" ADD CONSTRAINT "shop_shop_type_id_fkey" FOREIGN KEY ("shop_type_id") REFERENCES "shop_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_type_requirement" ADD CONSTRAINT "shop_type_requirement_shop_type_id_fkey" FOREIGN KEY ("shop_type_id") REFERENCES "shop_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_type_requirement" ADD CONSTRAINT "shop_type_requirement_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "verification_requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_business_category" ADD CONSTRAINT "shop_business_category_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_business_category" ADD CONSTRAINT "shop_business_category_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_category_document" ADD CONSTRAINT "shop_category_document_shop_business_category_id_fkey" FOREIGN KEY ("shop_business_category_id") REFERENCES "shop_business_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_category_document" ADD CONSTRAINT "shop_category_document_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_document" ADD CONSTRAINT "shop_document_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_document" ADD CONSTRAINT "shop_document_requirement_id_fkey" FOREIGN KEY ("requirement_id") REFERENCES "verification_requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_document_file" ADD CONSTRAINT "shop_document_file_shop_document_id_fkey" FOREIGN KEY ("shop_document_id") REFERENCES "shop_document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_document_file" ADD CONSTRAINT "shop_document_file_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_authorization" ADD CONSTRAINT "brand_authorization_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_authorization" ADD CONSTRAINT "brand_authorization_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_authorization" ADD CONSTRAINT "brand_authorization_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_model" ADD CONSTRAINT "product_model_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_model" ADD CONSTRAINT "product_model_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_seller_user_id_fkey" FOREIGN KEY ("seller_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_product_model_id_fkey" FOREIGN KEY ("product_model_id") REFERENCES "product_model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer" ADD CONSTRAINT "offer_distribution_node_id_fkey" FOREIGN KEY ("distribution_node_id") REFERENCES "distribution_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_media" ADD CONSTRAINT "offer_media_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_media" ADD CONSTRAINT "offer_media_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_document" ADD CONSTRAINT "offer_document_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_document" ADD CONSTRAINT "offer_document_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_batch" ADD CONSTRAINT "supply_batch_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_batch" ADD CONSTRAINT "supply_batch_product_model_id_fkey" FOREIGN KEY ("product_model_id") REFERENCES "product_model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_batch" ADD CONSTRAINT "supply_batch_distribution_node_id_fkey" FOREIGN KEY ("distribution_node_id") REFERENCES "distribution_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_document" ADD CONSTRAINT "batch_document_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "supply_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_document" ADD CONSTRAINT "batch_document_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_batch_link" ADD CONSTRAINT "offer_batch_link_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offer_batch_link" ADD CONSTRAINT "offer_batch_link_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "supply_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_label" ADD CONSTRAINT "verification_label_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_event" ADD CONSTRAINT "provenance_event_label_id_fkey" FOREIGN KEY ("label_id") REFERENCES "verification_label"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provenance_event" ADD CONSTRAINT "provenance_event_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart" ADD CONSTRAINT "cart_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "cart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_item" ADD CONSTRAINT "cart_item_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_buyer_shop_id_fkey" FOREIGN KEY ("buyer_shop_id") REFERENCES "shop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_buyer_distribution_node_id_fkey" FOREIGN KEY ("buyer_distribution_node_id") REFERENCES "distribution_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item" ADD CONSTRAINT "order_item_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_batch_allocation" ADD CONSTRAINT "order_item_batch_allocation_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_batch_allocation" ADD CONSTRAINT "order_item_batch_allocation_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "supply_batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_intent" ADD CONSTRAINT "payment_intent_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escrow" ADD CONSTRAINT "escrow_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute" ADD CONSTRAINT "dispute_opened_by_user_id_fkey" FOREIGN KEY ("opened_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "dispute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_evidence" ADD CONSTRAINT "dispute_evidence_media_asset_id_fkey" FOREIGN KEY ("media_asset_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_thread" ADD CONSTRAINT "chat_thread_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_thread" ADD CONSTRAINT "chat_thread_buyer_user_id_fkey" FOREIGN KEY ("buyer_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_thread" ADD CONSTRAINT "chat_thread_seller_user_id_fkey" FOREIGN KEY ("seller_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_thread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "moderation_case" ADD CONSTRAINT "moderation_case_assigned_admin_user_id_fkey" FOREIGN KEY ("assigned_admin_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "distribution_pricing_policy" ADD CONSTRAINT "distribution_pricing_policy_network_id_fkey" FOREIGN KEY ("network_id") REFERENCES "distribution_network"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_pricing_policy" ADD CONSTRAINT "distribution_pricing_policy_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "distribution_node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_pricing_policy" ADD CONSTRAINT "distribution_pricing_policy_product_model_id_fkey" FOREIGN KEY ("product_model_id") REFERENCES "product_model"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_pricing_policy" ADD CONSTRAINT "distribution_pricing_policy_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
