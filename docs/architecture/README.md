# Distributed System Architecture & Resilience Guide

Folder ini memuat dokumentasi arsitektur sistem terdistribusi, protokol komunikasi, strategi keandalan (*Fault Tolerance & Resilience*), dan optimasi transportasi data di project **Nexa Streetwear E-Commerce**.

Setiap panduan membedah **Masalah Arsitektural / Vektor Kegagalan**, **Solusi Teoretis & Best Practice**, serta **Implementasi Nyata di Codebase Project Ini**.

---

## Daftar Panduan Arsitektur & Keandalan

| No | Topik Arsitektur | Dokumen | Implementasi di Codebase | Ringkasan Penerapan |
|:---|:---|:---|:---|:---|
| 01 | **WebSocket Communication** | [01-websocket.md](./01-websocket.md) | [nginx/nginx.conf#L40-L43](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/nginx/nginx.conf#L40-L43) & [config/redis.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/redis.ts) | Protokol Full-Duplex RFC 6455, konfirmasi pembayaran instan Midtrans, live inventory flash sale, dan scaling multi-node via Redis Pub/Sub. |
| 02 | **gRPC & Protocol Buffers** | [02-grpc.md](./02-grpc.md) | [02-grpc.md#4](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/docs/architecture/02-grpc.md#4-implementasi-desain-kontrak-protobuf-nexa-streetwear) | High-performance RPC biner over HTTP/2, pemangkasan ukuran payload >80%, skema Protobuf biner, dan komunikasi privat antar-microservices. |
| 03 | **Message Queues** | [03-message-queues.md](./03-message-queues.md) | [config/redis.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/redis.ts) & [03-message-queues.md#4](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/docs/architecture/03-message-queues.md#4-implementasi-nyata-di-codebase-nexa-streetwear) | Asynchronous decoupling via Redis BullMQ, load leveling peredam flash sale, fault-tolerant background workers, dan Dead-Letter Queue (DLQ). |
| 04 | **Distributed Transactions** | [04-distributed-transactions.md](./04-distributed-transactions.md) | [order.service.ts#L42-L117](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L42-L117) | Penanganan partial failures di microservices, Saga Pattern dengan compensating transactions, Outbox Pattern, dan evaluasi ACID monolitik. |
| 05 | **Idempotency** | [05-idempotency.md](./05-idempotency.md) | [idempotencyMiddleware.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/idempotencyMiddleware.ts) | Pencegahan double-charge & order ganda saat network retry, header `Idempotency-Key`, atomic lock via Redis `SET NX`, dan header `X-Idempotent-Replay`. |
| 06 | **Timeouts & Cascading Failure** | [06-timeouts.md](./06-timeouts.md) | [server.ts#L12-L17](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/server.ts#L12-L17) & [nginx/nginx.conf#L45-L47](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/nginx/nginx.conf#L45-L47) | Pencegahan thread starvation, hierarki Timeout Budgeting (Nginx 30s -> Express 15s -> DB 5s), soket Keep-Alive 65s, dan abort signals. |
| 07 | **Exponential Backoff & Jitter** | [07-exponential-backoff.md](./07-exponential-backoff.md) | [order.service.ts#L38](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L38) & [11-database-deadlock-storm.md](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/docs/database/11-database-deadlock-storm.md) | Peredam Thundering Herd & Retry Storms, formula Full Jitter acak, penanganan transient deadlock Prisma `P2034`, dan helper `retryWithBackoff`. |
| 08 | **Payload Management** | [08-payload-management.md](./08-payload-management.md) | [app.ts#L144-L145](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/app.ts#L144-L145) & [nginx/nginx.conf#L21](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/nginx/nginx.conf#L21) | Proteksi DoS batas 1MB body (`express.json`), Sharp streaming convert WebP on-the-fly, kompresi Gzip/Brotli, dan Zod DTO schema sanitization. |

---

## Quick Architecture Verification Cheatsheet

```bash
# 1. Menguji Idempotency Key (Kirim request dengan key yang sama)
curl -i -X POST http://localhost:5000/api/orders/checkout \
  -H "Idempotency-Key: test-uuid-001" -d '{"items":[]}'

# 2. Menguji penolakan Payload raksasa (Batas 1MB)
curl -i -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" -d "{\"data\":\"$(head -c 2M </dev/zero | tr '\0' 'x')\"}"

# 3. Memantau antrean BullMQ di Redis
redis-cli KEYS "bull:*"
```
