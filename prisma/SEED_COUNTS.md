# AntiFake Full UAT Seed Counts

This package contains the complete replacement seed files for the AntiFake backend.

## Files

- `prisma/seed.ts`
- `prisma/seeds/00-utils.ts`
- `prisma/seeds/01-master-data.seed.ts`
- `prisma/seeds/02-users-kyc.seed.ts`
- `prisma/seeds/03-shops.seed.ts`
- `prisma/seeds/04-offers.seed.ts`
- `prisma/seeds/05-batches-qr.seed.ts`
- `prisma/seeds/06-distribution.seed.ts`
- `prisma/seeds/07-orders.seed.ts`
- `prisma/seeds/08-reviews-disputes.seed.ts`
- `prisma/seeds/09-affiliate.seed.ts`
- `prisma/seeds/10-social-chat-live.seed.ts`
- `prisma/seeds/11-notifications-moderation.seed.ts`
- `prisma/seeds/README.md`

## Main record counts

- User: 20
- UserAddress: 35
- UserKyc: 12
- UserKycDocument: 24
- UserKycSubmission: 15
- UserKycSubmissionDocument: 24 created for first submissions; extra submissions created without duplicate documents to avoid unique conflicts
- AuthSession: 10
- PasswordResetToken: 5
- ShopType: 4
- VerificationRequirement: 5
- ShopTypeRequirement: 7
- ShippingCarrier: 5
- Shop: 15
- ShopBusinessCategory: 30
- ShopDocument: 25
- ShopDocumentFile: 50
- ShopCategoryDocument: 30
- BrandAuthorization: up to 20, unique by shop-brand
- Category: 15
- Brand: 15
- Offer: 60
- OfferMedia: 120
- OfferDocument: 30
- OfferShippingMethod: 120
- SupplyBatch: 40
- BatchDocument: 40
- OfferBatchLink: up to 80, unique by offer-batch
- VerificationLabel: 200
- ProvenanceEvent: 800
- RiskScore: 50
- Cart: 20
- CartItem: up to 80, unique by cart-offer
- UserFavoriteOffer: up to 200, unique by user-offer
- DistributionNetwork: 2
- DistributionNode: 30
- DistributionShipment: 20
- DistributionShipmentItem: 40
- DistributionPricingPolicy: 20
- Order: 200
- OrderItem: 300
- OrderItemBatchAllocation: 300
- PaymentIntent: 200
- Escrow: 200
- Review: up to 100, constrained by completed order items
- ReviewMedia: up to 20
- Dispute: 10
- DisputeEvidence: 30
- AffiliateProgram: 2
- AffiliateAccount: 10
- AffiliateCode: 15
- AffiliateConversion: 20
- AffiliateCommissionLedger: 60
- AffiliatePayout: 4
- SocialPost: 20
- SocialComment: 100
- SocialCommentLike: up to 180, unique by comment-user
- SocialCommentReply: 75
- SocialCommentReplyLike: up to 90, unique by reply-user
- SocialReaction: up to 300, unique by post-user-reaction
- SocialShare: up to 50, unique by post-user
- ChatThread: up to 20, unique by buyer-shop
- ChatMessage: 200
- LiveCommerceSession: 10
- LiveSessionOffer: up to 30, unique by session-offer
- LiveSessionReminder: up to 50, unique by session-user
- LiveSessionComment: 100
- Notification: 400
- NotificationFcmToken: 25
- NotificationDeliveryAttempt: 600
- Report: 20
- ModerationCase: 10
- AuditLog: 100

## Run

```bash
npm run db:seed
```

The seed clears existing dev/UAT data first. Do not run against production.
