# Ecommerce Anti-Fake Backend

Backend da duoc tach thanh cac microservice chay rieng:

```text
apps/
|- api-gateway/
|- auth-service/
|- users-service/
|- catalog-service/
|- orders-service/
`- affiliate-service/
```

## Kien truc

- `api-gateway`: nhan HTTP request, verify JWT, expose Swagger, proxy sang RPC services.
- `auth-service`: xu ly register, login, refresh token, logout.
- `users-service`: xu ly user profile, KYC, user identity lookup.
- `catalog-service`: xu ly shops, products, distribution.
- `orders-service`: xu ly retail order, wholesale order, dispute, refund.
- `affiliate-service`: xu ly affiliate program, account, conversion, payout.
- `libs/contracts`: shared DTO, types, message patterns, client tokens.
- `libs/security`: JWT guard, role guard, current-user decorators cho gateway.
- `libs/database`: Prisma module/service duoc dung boi backend services.

## Message Flow

```text
Client HTTP
  -> api-gateway
     -> auth-service (TCP)
     -> users-service (TCP)
     -> catalog-service (TCP)
     -> orders-service (TCP)
     -> affiliate-service (TCP)

auth-service
  -> users-service (TCP) de tra cuu / tao user

orders-service
  -> catalog-service (TCP) de resolve wholesale pricing khi can
```

## Chay local

Mo 6 terminal rieng:

```bash
npm install
npm run start:dev:users
npm run start:dev:auth
npm run start:dev:catalog
npm run start:dev:orders
npm run start:dev:affiliate
npm run start:dev:gateway
```

Gateway mac dinh:

- `PORT=3001`
- Swagger: `http://localhost:3001/swagger`

Service mac dinh:

- `AUTH_SERVICE_HOST=127.0.0.1`
- `AUTH_SERVICE_PORT=4001`
- `USERS_SERVICE_HOST=127.0.0.1`
- `USERS_SERVICE_PORT=4002`
- `CATALOG_SERVICE_HOST=127.0.0.1`
- `CATALOG_SERVICE_PORT=4003`
- `ORDERS_SERVICE_HOST=127.0.0.1`
- `ORDERS_SERVICE_PORT=4004`
- `AFFILIATE_SERVICE_HOST=127.0.0.1`
- `AFFILIATE_SERVICE_PORT=4005`

Gateway dang giu fallback ve `USERS_SERVICE_*` cho `catalog`, `orders`, `affiliate` de qua trinh tach service khong bi gay ngay. Khi deploy on dinh, nen set day du `CATALOG_SERVICE_*`, `ORDERS_SERVICE_*`, `AFFILIATE_SERVICE_*` thay vi dua vao fallback.

## Build

```bash
npm run build
```

## Scripts chinh

```bash
npm run start:dev:gateway
npm run start:dev:auth
npm run start:dev:users
npm run start:dev:catalog
npm run start:dev:orders
npm run start:dev:affiliate
npm run start:prod
npm run start:prod:auth
npm run start:prod:users
npm run start:prod:catalog
npm run start:prod:orders
npm run start:prod:affiliate
```
