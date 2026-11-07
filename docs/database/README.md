# Database Architecture & Optimization Guide

Folder ini memuat dokumentasi arsitektur, optimasi, dan panduan troubleshooting database PostgreSQL di project **Nexa Streetwear E-Commerce**.

Setiap dokumen membedah **Masalah**, **Solusi Teoretis / Best Practice**, serta **Implementasi Nyata di Codebase Project Ini**.

---

## Daftar Panduan

| No | Topik Masalah | Dokumen | Ringkasan Penerapan di Project |
|:---|:---|:---|:---|
| 01 | **Missing Database Migration** | [01-missing-database-migration.md](./01-missing-database-migration.md) | Prisma Migrate version control schema, deploy otomatis di CI/CD & Docker. |
| 02 | **Data Seeder** | [02-data-seeder.md](./02-data-seeder.md) | Modular idempotent seeders (Kategori $\to$ Users $\to$ 25 Produk & Kompresi WebP). |
| 03 | **Query Builder vs ORM** | [03-query-builder-vs-orm.md](./03-query-builder-vs-orm.md) | Type-safe queries via Prisma ORM & raw query fallback dengan Type-safety. |
| 04 | **Unsanitized Raw Queries** | [04-unsanitized-raw-queries.md](./04-unsanitized-raw-queries.md) | Anti-SQL Injection via parameterized queries, Prisma tagged templates & Zod. |
| 05 | **N+1 Query Problem** | [05-n-plus-one-query-problem.md](./05-n-plus-one-query-problem.md) | Batching `WHERE IN (...)` dan Recursive CTE untuk hierarki kategori. |
| 06 | **Missing Database Index** | [06-missing-database-index.md](./06-missing-database-index.md) | Strategi B-Tree index pada slug, foreign keys, status order, dan soft-delete. |
| 07 | **Database Index Fragmentation** | [07-database-index-fragmentation.md](./07-database-index-fragmentation.md) | Maintenance online `REINDEX CONCURRENTLY` tanpa downtime via script TypeScript. |
| 08 | **Leaked Database Connection** | [08-leaked-database-connection.md](./08-leaked-database-connection.md) | Prisma global singleton, block finally release, dan OS Graceful Shutdown. |
| 09 | **Connection Pool Exhaustion & PgBouncer** | [09-database-connection-pool-exhaustion.md](./09-database-connection-pool-exhaustion.md) | PgBouncer port 6432, Prisma dual URL (`url` & `directUrl`), Redis caching & Read Replicas. |
| 10 | **Deadlock & Race Condition** | [10-deadlock-and-race-condition.md](./10-deadlock-and-race-condition.md) | Consistent lock ordering (sort by ID), conditional atomic decrement & DB check constraint. |

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
