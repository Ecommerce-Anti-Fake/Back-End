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

## Firebase Auth

Firebase Auth duoc dung de xac thuc email/phone truoc khi backend cap JWT noi bo:

- Frontend email: Firebase email/password + email verification link.
- Frontend phone: Firebase Phone Authentication + SMS OTP + invisible reCAPTCHA.
- Frontend Google: Firebase Google provider.
- Backend endpoint: `POST /auth/firebase-login` verify Firebase ID token, tao user neu chua ton tai, roi cap access/refresh token noi bo.

Backend can Firebase Admin service account qua bien moi truong:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

`FIREBASE_PRIVATE_KEY` co the luu dang mot dong voi `\n`; service se chuyen ve newline that luc khoi tao Firebase Admin. Khong commit service account JSON hoac private key vao repo.

## Redis / Realtime Foundation

Redis is optional by default and is only used for ephemeral realtime coordination. PostgreSQL remains the durable source of truth.

Local disabled fallback:

- Leave `REDIS_ENABLED` unset and do not set `REDIS_URL` or `REDIS_HOST`.

Local Redis:

- `REDIS_ENABLED=true`
- Optional: `REDIS_HOST=127.0.0.1`
- Optional: `REDIS_PORT=6379`
- Optional: `REDIS_DB=0`

Production Redis:

- `REDIS_URL=redis://user:password@host:6379/0`
- Optional: `REDIS_KEY_PREFIX=acf`
- Optional: `REDIS_DEFAULT_TTL_SECONDS=300`
- Optional: `REDIS_CONNECTION_NAME=acf-realtime`

RT0 shared conventions live in `libs/common/src/realtime`:

- Socket.IO adapter/pubsub namespace: `rt:socket-io`, `rt:pubsub`
- Rate limiting namespace: `rt:rate-limit`, default TTL 60 seconds
- Presence namespace: `rt:presence`, default TTL 90 seconds
- Session namespace: `rt:session`, default TTL 900 seconds
- Live counter namespace: `rt:live-counter`, default TTL 300 seconds
- Cache namespace: `rt:cache`, default TTL 300 seconds

Do not store durable business state in Redis. Realtime keys must either expire or be recoverable from PostgreSQL or client reconnect/refetch state.

RT1 shared event foundation also lives in `libs/common/src/realtime`:

- Event names are versioned as `<family>.<resource>.<action>.v1`.
- Initial contracts: `notification.order.created.v1`, `chat.message.created.v1`, `live.reaction.ephemeral.v1`.
- Each event definition declares payload fields, allowed audience scope, dedupe fields, persistence/recovery rules, eligible transports, rate-limit expectations, and audit requirements.
- Durable events must be created after a committed PostgreSQL write; `RealtimeEventDispatcher` rejects durable events with `source.writeCommitted=false`.
- Durable dispatches produce audit entries through registered audit sinks. Ephemeral events declare whether they are droppable, sampled, or aggregated.
- Transport sinks are registered per transport; RT1 does not create SSE/WebSocket/FCM emitters.

RT2 notification delivery surfaces:

- `POST /user/notifications/fcm-token` registers or reactivates the current browser FCM token.
- `POST /user/notifications/fcm-token/revoke` revokes a browser FCM token by token or device ID.
- `GET /user/notifications/events?accessToken=...` is an authenticated SSE invalidation stream for notification list/unread count refetch.
- `NotificationFcmToken` stores active/revoked browser tokens; `NotificationDeliveryAttempt` records FCM delivery outcomes without blocking canonical in-app notifications.
- FCM requires Firebase Admin env vars plus frontend `VITE_FIREBASE_VAPID_KEY`. If Firebase Admin is not configured, FCM attempts fail closed and are tracked as delivery failures.

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
