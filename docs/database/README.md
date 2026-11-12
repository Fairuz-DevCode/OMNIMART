# Database Architecture & Optimization Guide

Folder ini memuat dokumentasi arsitektur, optimasi, dan panduan troubleshooting database PostgreSQL di project **Nexa Streetwear E-Commerce**.

Setiap dokumen membedah **Masalah**, **Solusi Teoretis / Best Practice**, serta **Implementasi Nyata di Codebase Project Ini**.

---

## Daftar Panduan

| No | Topik Masalah | Dokumen | Implementasi di Codebase | Ringkasan Penerapan |
|:---|:---|:---|:---|:---|
| 01 | **Missing Database Migration** | [01-missing-database-migration.md](./01-missing-database-migration.md) | [prisma/migrations](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/prisma/migrations) & [package.json#L13](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/package.json#L13) | Prisma Migrate version control schema, deploy otomatis di CI/CD & Docker. |
| 02 | **Data Seeder** | [02-data-seeder.md](./02-data-seeder.md) | [seed/index.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/seed/index.ts) & [categorySeeder.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/seed/categorySeeder.ts) | Modular idempotent seeders (Kategori $\to$ Users $\to$ 25 Produk & Kompresi WebP). |
| 03 | **Query Builder vs ORM** | [03-query-builder-vs-orm.md](./03-query-builder-vs-orm.md) | [config/prisma.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/prisma.ts) | Type-safe queries via Prisma ORM & raw query fallback dengan Type-safety. |
| 04 | **Unsanitized Raw Queries** | [04-unsanitized-raw-queries.md](./04-unsanitized-raw-queries.md) | [product.model.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.model.ts) | Anti-SQL Injection via parameterized queries, Prisma tagged templates & Zod. |
| 05 | **N+1 Query Problem** | [05-n-plus-one-query-problem.md](./05-n-plus-one-query-problem.md) | [product.model.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.model.ts) | Batching `WHERE IN (...)` dan Recursive CTE untuk hierarki kategori. |
| 06 | **Missing Database Index** | [06-missing-database-index.md](./06-missing-database-index.md) | [prisma/schema.prisma](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/prisma/schema.prisma) | Strategi B-Tree index pada slug, foreign keys, status order, dan soft-delete. |
| 07 | **Database Index Fragmentation** | [07-database-index-fragmentation.md](./07-database-index-fragmentation.md) | [scripts/reindex.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/scripts/reindex.ts) | Maintenance online `REINDEX CONCURRENTLY` tanpa downtime via script TypeScript. |
| 08 | **Leaked Database Connection** | [08-leaked-database-connection.md](./08-leaked-database-connection.md) | [config/prisma.ts#L33-L43](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/prisma.ts#L33-L43) & [server.ts#L23](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/server.ts#L23) | Prisma global singleton, block finally release, dan OS Graceful Shutdown. |
| 09 | **Connection Pool Exhaustion & PgBouncer** | [09-database-connection-pool-exhaustion.md](./09-database-connection-pool-exhaustion.md) | [docker-compose.yml#L24-L50](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/docker-compose.yml#L24-L50) | PgBouncer port 6432, Prisma dual URL (`url` & `directUrl`), Redis caching & Read Replicas. |
| 10 | **Deadlock & Race Condition** | [10-deadlock-and-race-condition.md](./10-deadlock-and-race-condition.md) | [order.model.ts#L56-L68](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.model.ts#L56-L68) | Consistent lock ordering (sort by ID), conditional atomic decrement & DB check constraint. |
| 11 | **Database Deadlock Storm** | [11-database-deadlock-storm.md](./11-database-deadlock-storm.md) | [order.service.ts#L38](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L38) | Exponential backoff + random jitter retry helper untuk meredam thundering herd. |
| 12 | **Database ACID Compliance** | [12-database-acid-compliance.md](./12-database-acid-compliance.md) | [order.service.ts#L42-L117](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L42-L117) | Audit 4 pilar ACID (Atomicity, Consistency, Isolation, Durability) di codebase. |
| 13 | **Soft Delete vs Hard Delete** | [13-soft-delete-vs-hard-delete.md](./13-soft-delete-vs-hard-delete.md) | [prisma/schema.prisma](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/prisma/schema.prisma) (`deletedAt`) | Soft delete produk & proteksi varian historis vs hard delete cart & token sementara. |
| 14 | **Pagination Optimization** | [14-pagination-optimization.md](./14-pagination-optimization.md) | [product.controller.ts#L40-L60](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.controller.ts#L40-L60) | Hybrid pagination (Keyset Cursor untuk infinite scroll vs Offset untuk lompat halaman admin). |
| 15 | **Database Replication & Lag** | [15-database-replication-and-lag.md](./15-database-replication-and-lag.md) | [config/prisma.ts#L19-L28](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/prisma.ts#L19-L28) | Physical Streaming Replication, bahaya Replication Lag pada stok & mitigasi data-sensitivity splitting. |
| 16 | **Database Sharding** | [16-database-sharding.md](./16-database-sharding.md) | [prisma/schema.prisma](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/prisma/schema.prisma) | Evaluasi arsitektur sharding, alasan penundaan (prinsip "Don't Shard Until You Must"), & roadmap Citus masa depan. |
| 17 | **Full-Text Search Engine** | [17-full-text-search-engine.md](./17-full-text-search-engine.md) | [product.model.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.model.ts) (`searchProductsFuzzy`) | Mesin FTS Inverted Index, GIN Trigram (`pg_trgm`), perbandingan vs Elasticsearch, & fitur Typo-Tolerance. |
| 18 | **Database Constraints** | [18-database-constraints.md](./18-database-constraints.md) | [prisma/schema.prisma](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/prisma/schema.prisma) | 6 pilar integritas data, benteng pertahanan terakhir dari race condition, & implementasi CHECK constraints. |
| 19 | **Database Backup & PITR** | [19-database-backup-and-pitr.md](./19-database-backup-and-pitr.md) | [scripts/backup.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/scripts/backup.ts) | Point-in-Time Recovery, pemulihan data detik per detik via WAL LSN & Named Restore Point. |
| 20 | **Access Logging & Telemetry** | [Log Aggregation & Monitoring](../security/11-log-aggregation-and-monitoring.md) | [accessLogMiddleware.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/accessLogMiddleware.ts) & [logManager.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/scripts/logManager.ts) | Digabung terpusat: Proteksi DB dari bloat traffic log, async file streaming (.jsonl), sub-ms latency telemetry & daily Gzip compression. |

---

## Quick Command Cheatsheet

```bash
# Menjalankan migrasi database
npm run db:migrate

# Menjalankan maintenance defragmentasi indeks database (zero-downtime)
npm run db:reindex

# Menjalankan backup PostgreSQL
npm run db:backup

# Menjalankan seeder database
npm run seed              # Seed seluruh database
npm run seed:categories   # Hanya kategori
npm run seed:users        # Hanya admin & customer demo
npm run seed:products     # Hanya 25 produk, varian & kompresi WebP
```

---

## Review Senior Backend: Roadmap Database Menuju Batasan Mentok Skalabilitas

Arsitektur database PostgreSQL project Nexa sudah menerapkan optimasi level produksi tinggi (ACID compliance, trigram FTS, deadlock storm mitigation, PITR backup, pure soft delete, dan connection pooling). 

Untuk membawa sistem ini ke **skala jutaan transaksi harian (*Hyperscale E-Commerce*)**, berikut ringkasan gap arsitektur yang belum diimplementasikan:
1. **Automated Disaster Recovery Testing:** Otomatisasi pengujian restore file backup harian ke server staging terpisah untuk memastikan backup 100% valid.
2. **Partial Indexes (Filtered Indexes):** Penghematan RAM drastis dengan mengindeks hanya data aktif (`WHERE status = 'PENDING_PAYMENT'`).
3. **In-Memory Flash Sale Lock Engine:** Pemindahan lock stok sementara ke Redis Lua script untuk menangani serbuan puluhan ribu pesanan dalam hitungan detik.
4. **Log & Query Observability Cluster:** Log shipper terpusat (Vector/FluentBit) ke Grafana Loki untuk pemantauan latency p99 secara real-time.
