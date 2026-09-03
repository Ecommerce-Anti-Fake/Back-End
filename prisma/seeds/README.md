# AntiFake compact UAT seed

This seed recreates a disposable, isolated UAT database with a compact set of
synthetic relationships across catalog, shops, variants, inventory,
distribution, carts, orders, reviews, disputes, affiliate, social, chat, live
commerce, notifications, moderation, wallets, vouchers and COD settlement.

Run the guarded workflow from `back-end`:

```powershell
npm.cmd run uat:reset
npm.cmd run uat:verify
```

The workflow requires an injected UAT environment, an isolated PostgreSQL
target and secure values for `UAT_TEST_PASSWORD`, `UAT_QR_CODE` and
`PAYOUT_ACCOUNT_ENCRYPTION_KEY`. It migrates, clears, seeds and verifies the
target. It does not accept a production database or a hosted-database bypass.

The default profile is intentionally small: 8 synthetic users, 6 synthetic
shops, 18 synthetic offers, 24 orders and the supporting records needed to
exercise the application flows.

## Synthetic accounts

The reusable aliases are `BUYER_UAT`, `SELLER_UAT`, `AFFILIATE_UAT` and
`ADMIN_UAT`. Their email values and password are supplied by the secure UAT
environment and are intentionally not recorded in source or documentation.

All names, addresses, phone numbers, business identifiers, products, media
metadata, messages and posts are disposable UAT values. Seeded media uses safe
placeholder URLs and does not claim a Cloudinary upload. Wallet, payment,
withdrawal and affiliate ledger rows are non-payable documentation fixtures.

Do not run standalone data-update scripts against a target unless they have
passed the same UAT guard and the change is explicitly approved. The reset
workflow is the supported reproducible path.
