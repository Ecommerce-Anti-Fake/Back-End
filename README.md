# Ecommerce Anti-Fake Backend

Backend da duoc tach thanh real microservices voi 3 app chay rieng:

```text
apps/
├─ api-gateway/
├─ auth-service/
└─ users-service/
```

## Kien truc

- `api-gateway`: nhan HTTP request, verify JWT, expose Swagger, proxy sang RPC services.
- `auth-service`: xu ly register, login, refresh token, logout.
- `users-service`: xu ly thong tin user va user identity lookup.
- `libs/contracts`: shared DTO, types, message patterns, client tokens.
- `libs/security`: JWT guard, role guard, current-user decorators cho gateway.
- `libs/database`: Prisma module/service duoc dung boi backend services.

## Message Flow

```text
Client HTTP
  -> api-gateway
     -> auth-service (TCP)
     -> users-service (TCP)

auth-service
  -> users-service (TCP) de tra cuu / tao user
```

## Chay local

Mo 3 terminal rieng:

```bash
npm install
npm run start:dev:users
npm run start:dev:auth
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

## Build

```bash
npm run build
```

## Scripts chinh

```bash
npm run start:dev:gateway
npm run start:dev:auth
npm run start:dev:users
npm run start:prod
npm run start:prod:auth
npm run start:prod:users
```
