# AntiFake UAT Seed

Bộ seed này thay thế seed demo cũ và được tách theo module nghiệp vụ.

## Cách chạy

```bash
npm run db:seed
```

Lệnh này đang trỏ tới `ts-node prisma/seed.ts` trong `package.json`, nên chỉ cần copy thư mục `prisma/seed.ts` và `prisma/seeds/` vào project là chạy được.

## Tài khoản demo

Mật khẩu chung cho toàn bộ user seed:

```txt
12345678
```

Admin:

```txt
seed.user19@antifake.local
seed.user20@antifake.local
```

Buyer/shop/affiliate users:

```txt
seed.user01@antifake.local
...
seed.user18@antifake.local
```

## Quy mô dữ liệu chính

- User: 20
- Shop: 15
- Brand: 15
- Category: 15
- Offer: 60
- SupplyBatch: 40
- VerificationLabel QR: 200
- ProvenanceEvent: 800
- Order: 200
- Review: 100
- Notification: 400
- ChatMessage: 200
- SocialPost: 20
- LiveCommerceSession: 10
- AffiliateProgram: 2

## Lưu ý

Seed này có `clearSeedData()` và sẽ xóa dữ liệu hiện tại của các bảng nghiệp vụ trước khi tạo lại dữ liệu UAT. Không chạy trên database production.
