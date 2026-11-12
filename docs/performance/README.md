# Performance Architecture & Optimization Guide

Folder ini memuat dokumentasi arsitektur performa, strategi optimasi latensi (*High Throughput & Low Latency*), dan efisiensi resource di project **Nexa Streetwear E-Commerce**.

Setiap panduan membedah **Masalah Latensi / Bottleneck**, **Solusi Teoretis & Best Practice**, serta **Implementasi Nyata di Codebase Project Ini**.

---

## Daftar Panduan Performa

| No | Topik Performa | Dokumen | Implementasi di Codebase | Ringkasan Penerapan |
|:---|:---|:---|:---|:---|
| 01 | **Caching Strategy & Invalidation** | [01-caching-strategy-and-invalidation.md](./01-caching-strategy-and-invalidation.md) | [cacheMiddleware.ts#L19-L65](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/cacheMiddleware.ts#L19-L65) & [product.routes.ts#L39-L49](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.routes.ts#L39-L49) | Redis Cache-Aside, mitigasi stale data via automatic write-invalidation, non-blocking `scanStream` pattern, dan peredam thundering herd. |
| 02 | **Stale Cache & Invalidation Strategies** | [02-stale-cache-and-invalidation.md](./02-stale-cache-and-invalidation.md) | [cacheMiddleware.ts#L120-L162](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/cacheMiddleware.ts#L120-L162) & [order.service.ts#L118-L123](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L118-L123) | Anatomi stale cache (phantom pricing & ghost stock), taksonomi invalidasi, prinsip "Purge, Don't Update", dan implementasi event-driven di Nexa. |
| 03 | **Memory Leak Detection & Prevention** | [03-memory-leak-detection-and-prevention.md](./03-memory-leak-detection-and-prevention.md) | [config/prisma.ts#L33-L43](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/prisma.ts#L33-L43) & [server.ts#L18-L44](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/server.ts#L18-L44) | Mekanika V8 Heap & GC, mitigasi 5 sumber kebocoran (global cache, Prisma singleton, listener leak, unref timer), dan profiling heap. |
| 04 | **Out Of Memory (OOM) & Linux OOM Killer** | [04-out-of-memory-oom-killer.md](./04-out-of-memory-oom-killer.md) | [app.ts#L144](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/app.ts#L144) & [package.json#L7-L8](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/package.json#L7-L8) | V8 Heap Exhaustion vs Linux OOM Killer (`oom_score`), proteksi payload 1MB, streaming file, dan `--max-old-space-size=1024`. |
| 05 | **Disk I/O Bottleneck & Throughput** | [05-disk-io-bottleneck.md](./05-disk-io-bottleneck.md) | [accessLogMiddleware.ts#L43-L45](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/accessLogMiddleware.ts#L43-L45) & [scripts/logManager.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/scripts/logManager.ts) | Penanganan IOPS & %util 100%, sequential append logging vs sync writes, rotasi Gzip batching, dan mitigasi disk thrashing. |
| 06 | **Disk Write Latency Spikes & fsync** | [06-disk-write-latency-spikes.md](./06-disk-write-latency-spikes.md) | [order.service.ts#L42-L117](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L42-L117) | Lonjakan latensi p99/p99.9, fsync stalls, kernel dirty page smoothing (`vm.dirty_ratio`), dan PostgreSQL WAL checkpoint spreading. |
| 07 | **TCP Port Exhaustion & TIME_WAIT** | [07-tcp-port-exhaustion.md](./07-tcp-port-exhaustion.md) | [server.ts#L12-L17](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/server.ts#L12-L17) & [config/redis.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/redis.ts) | Ephemeral port starvation, soket `TIME_WAIT` RFC 793, HTTP keep-alive socket reuse, dan kernel socket tuning (`tcp_tw_reuse`). |
| 08 | **File Descriptor Exhaustion & EMFILE** | [08-file-descriptor-exhaustion.md](./08-file-descriptor-exhaustion.md) | [accessLogMiddleware.ts#L37-L61](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/accessLogMiddleware.ts#L37-L61) | Batas `ulimit -n`, error `EMFILE: too many open files`, penutupan stream otomatis (`stream.end()`), dan singletons socket pool. |
| 09 | **Swap Space Thrashing & Memory Pressure** | [09-swap-space-thrashing.md](./09-swap-space-thrashing.md) | [config/redis.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/redis.ts) & [health.routes.ts#L64-L78](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/health/health.routes.ts#L64-L78) | Major page faults bolak-balik RAM-disk, pembekuan sistem, tuning `vm.swappiness = 10`, dan alokasi memory budgeting VPS. |
| 10 | **Concurrent Map Writes & Async Collisions** | [10-concurrent-map-writes.md](./10-concurrent-map-writes.md) | [order.model.ts#L56-L68](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.model.ts#L56-L68) & [order.service.ts#L38](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L38) | Interleaved async execution di Node.js, anti-overselling via atomic database decrement, consistent lock ordering, dan Redis atomic primitives. |
| 11 | **Unchecked Type Assertions & V8 De-opt** | [11-unchecked-type-assertions.md](./11-unchecked-type-assertions.md) | [config/env.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/env.ts) & [order.validation.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.validation.ts) | TypeScript type erasure, string concatenation bugs, V8 Hidden Classes / IC misses, dan validasi runtime Zod DTO fail-fast. |

---

## Quick Performance Verification Cheatsheet

```bash
# 1. Memeriksa status dan memory Redis
redis-cli INFO memory

# 2. Memeriksa response time dan header cache HTTP
curl -I http://localhost:5000/api/products

# 3. Memantau utilisasi disk I/O dan queue depth
iostat -xz 1

# 4. Memantau soket jaringan berstatus TIME_WAIT
ss -tan 'state time-wait' | wc -l

# 5. Memeriksa batas File Descriptor proses Node.js
cat /proc/$(pgrep -f "node")/limits | grep "Max open files"

# 6. Memantau swap in/out dan CPU wait
vmstat 1
```
