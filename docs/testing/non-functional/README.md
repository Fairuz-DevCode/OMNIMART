# Non-Functional Testing Guide

Folder ini memuat dokumentasi pengujian non-fungsional (*Non-Functional Testing*) yang menguji kualitas, ketahanan, keamanan siber (*Cybersecurity*), dan kemampuan skalabilitas performa sistem di project **Nexa Streetwear E-Commerce**.

---

## 📑 Daftar Panduan Pengujian Non-Fungsional

| No | Modul Pengujian | Dokumen | Ringkasan Cakupan | Tautan Implementasi di Codebase |
|:---|:---|:---|:---|:---|
| 01 | **Security Testing** | [01-security-testing.md](./01-security-testing.md) | Pengujian mitigasi celah OWASP Top 10: SQL Injection defense, pembatasan ukuran payload 1MB (413), HTTP Helmet headers, dan Rate Limiting brute-force. | [test/non-functional/security/](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/non-functional/security) |
| 02 | **Performance Testing** | [02-performance-testing.md](./02-performance-testing.md) | Pengujian throughput dan latensi: Internal micro-latency benchmark (<5ms), skrip Grafana k6 steady load (50 VUs), dan simulasi ledakan traffic Flash Sale (300 VUs). | [test/non-functional/performance/](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/test/non-functional/performance) |
