# Functional Testing Guide

Folder ini memuat dokumentasi pengujian fungsional (*Functional Testing*) yang memvalidasi bahwa setiap fitur bisnis, rumus kalkulasi, validasi skema data, dan endpoint API di platform **Nexa Streetwear** bekerja sesuai spesifikasi kebutuhan.

---

## 📑 Daftar Panduan Pengujian Fungsional

| No | Modul Pengujian | Dokumen | Ringkasan Cakupan | Tautan Implementasi di Codebase |
|:---|:---|:---|:---|:---|
| 01 | **Unit Testing** | [01-unit-testing.md](./01-unit-testing.md) | Pengujian logika terisolasi: validasi Zod DTO (8 berkas), kalkulasi diskon voucher, pembulatan bobot ongkir, mutasi stok, JWT dual-token, dan enkripsi AES-256-GCM. | [test/functional/unit/](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/unit) |
| 02 | **Integration Testing** | [02-integration-testing.md](./02-integration-testing.md) | Pengujian menyeluruh 12 modul API lengkap dengan PostgreSQL nyata & Redis tanpa mocking palsu. | [test/functional/integration/](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/functional/integration) |
| 03 | **End-to-End Testing (E2E)** | [03-end-to-end-testing.md](./03-end-to-end-testing.md) | Pengujian alur penuh browser nyata (Playwright di level root sejajar frontend & backend) menguji Homepage, Katalog, Login, hingga Protected Routes. | [e2e/](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/e2e) |
