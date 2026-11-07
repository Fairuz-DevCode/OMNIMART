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
| 11 | **Database Deadlock Storm** | [11-database-deadlock-storm.md](./11-database-deadlock-storm.md) | Exponential backoff + random jitter retry helper untuk meredam thundering herd. |
| 12 | **Database ACID Compliance** | [12-database-acid-compliance.md](./12-database-acid-compliance.md) | Audit 4 pilar ACID (Atomicity, Consistency, Isolation, Durability) di codebase. |
| 13 | **Soft Delete vs Hard Delete** | [13-soft-delete-vs-hard-delete.md](./13-soft-delete-vs-hard-delete.md) | Soft delete produk & proteksi varian historis vs hard delete cart & token sementara. |
| 14 | **Pagination Optimization** | [14-pagination-optimization.md](./14-pagination-optimization.md) | Hybrid pagination (Keyset Cursor untuk infinite scroll vs Offset untuk lompat halaman admin). |
| 15 | **Database Replication & Lag** | [15-database-replication-and-lag.md](./15-database-replication-and-lag.md) | Physical Streaming Replication, bahaya Replication Lag pada stok & mitigasi data-sensitivity splitting. |
| 16 | **Database Sharding** | [16-database-sharding.md](./16-database-sharding.md) | Evaluasi arsitektur sharding, alasan penundaan (prinsip "Don't Shard Until You Must"), & roadmap Citus masa depan. |
| 17 | **Full-Text Search Engine** | [17-full-text-search-engine.md](./17-full-text-search-engine.md) | Mesin FTS Inverted Index, GIN Trigram (`pg_trgm`), perbandingan vs Elasticsearch, & fitur Typo-Tolerance. |
| 18 | **Database Constraints** | [18-database-constraints.md](./18-database-constraints.md) | 6 pilar integritas data, benteng pertahanan terakhir dari race condition, & implementasi CHECK constraints. |
| 19 | **Database Backup & PITR** | [19-database-backup-and-pitr.md](./19-database-backup-and-pitr.md) | Point-in-Time Recovery, pemulihan data detik per detik via WAL LSN & Named Restore Point. |

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
