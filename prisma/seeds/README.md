# AntiFake production-like UAT seed

This seed recreates a disposable UAT database with realistic relationships across
catalog, shops, variants, inventory, distribution, carts, orders, reviews,
disputes, affiliate, social, chat, live commerce, notifications, moderation,
wallets, vouchers, and COD settlement.

Run from `back-end`:

```powershell
npm.cmd run db:seed
```

The seed is destructive: it clears application data before inserting fixtures.
It refuses hosted database URLs by default. For an explicitly approved hosted
UAT database only:

```powershell
$env:SEED_ALLOW_HOSTED_DB = 'true'
npm.cmd run db:seed
```

Never use that override for production data.

## Seed accounts

All seeded accounts use:

```txt
Password: antifake@2026
```

Admin:

```txt
admin@antifake.io.vn
```

Regular users are `seed.user01@antifake.local` through
`seed.user19@antifake.local`.
