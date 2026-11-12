# Security Architecture & Hardening Guide

Folder ini memuat dokumentasi arsitektur keamanan (*Application & Data Security*), mitigasi kerentanan (*OWASP Top 10*), serta panduan *hardening* sistem di project **Nexa Streetwear E-Commerce**.

Setiap dokumen membedah **Masalah & Vektor Serangan**, **Solusi Teoretis / Best Practice**, serta **Implementasi Nyata di Codebase Project Ini**.

---

## Daftar Panduan Keamanan

| No | Topik Keamanan | Dokumen | Implementasi di Codebase | Ringkasan Penerapan |
|:---|:---|:---|:---|:---|
| 01 | **SQL Injection (SQLi) Prevention** | [01-sql-injection.md](./01-sql-injection.md) | [product.model.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/product/product.model.ts) | Parameterized queries, Prisma AST engine, tagged template literals `$queryRaw`, safe low-level pg driver arrays, & Zod input validation. |
| 02 | **Environment Variables & Secrets Management** | [02-environment-variables-and-secrets.md](./02-environment-variables-and-secrets.md) | [config/env.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/config/env.ts) | Zod fail-fast schema, production `superRefine` hardening guard, zero raw `process.env` bypass, & error 500 masking. |
| 03 | **JWT Authentication & Lifecycle** | [03-jwt-authentication-lifecycle.md](./03-jwt-authentication-lifecycle.md) | [utils/token.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/utils/token.ts) & [auth.controller.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/auth/auth.controller.ts) | Dual-token architecture (15m access token + 7d HttpOnly refresh token), strict HS256 algorithm whitelisting, & instant revocation via Redis/PostgreSQL. |
| 04 | **CORS Policy & Origin Defense** | [04-cors-policy-and-origin-defense.md](./04-cors-policy-and-origin-defense.md) | [app.ts#L48-L54](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/app.ts#L48-L54) | Environment-aware whitelisting (zero localhost in production), regex subdomain matching, 403 Forbidden clean rejection, & 24h preflight caching. |
| 05 | **SSL/TLS & Transport Layer Security** | [05-ssl-tls-and-transport-security.md](./05-ssl-tls-and-transport-security.md) | [nginx/nginx.conf#L18-L35](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/nginx/nginx.conf#L18-L35) | Enkripsi end-to-end TLS 1.3, proxy-aware HTTPS 301 redirect, Helmet HSTS preload (1 tahun), remote DB TLS support, & secure cookie flags. |
| 06 | **Traffic Throttling & Rate Limiting** | [06-rate-limiting-and-throttling.md](./06-rate-limiting-and-throttling.md) | [middleware/securityMiddleware.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/securityMiddleware.ts) | 3-tier traffic shaping: soft delay throttling (speedLimiter), global API rate limit (150/15m), & strict auth brute-force limit (15/15m) with RFC 6585 headers. |
| 07 | **Role-Based Access Control (RBAC) & Ownership** | [07-role-based-access-control.md](./07-role-based-access-control.md) | [middleware/adminMiddleware.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/adminMiddleware.ts) & [order.service.ts#L138-L145](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.service.ts#L138-L145) | Pemisahan tegas hak akses admin vs user, zero role mass assignment, verifikasi kepemilikan data (BOLA defense), & 401 vs 403 HTTP semantics. |
| 08 | **Cross-Site Scripting (XSS) Prevention** | [08-xss-prevention-and-content-security.md](./08-xss-prevention-and-content-security.md) | [app.ts#L44-L45](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/app.ts#L44-L45) | React JSX automatic output escaping, zero `dangerouslySetInnerHTML`, Helmet security headers (`X-Content-Type-Options`), & HttpOnly cookie isolation. |
| 09 | **Cross-Site Request Forgery (CSRF) Protection** | [09-csrf-protection-and-cookie-defense.md](./09-csrf-protection-and-cookie-defense.md) | [middleware/csrfMiddleware.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/csrfMiddleware.ts) | Double-Submit Cookie pattern, `SameSite=Strict/Lax` cookie attributes, `crypto.timingSafeEqual` comparison, & automated frontend Axios interceptors. |
| 10 | **DDoS Mitigation & Traffic Management** | [10-ddos-mitigation-and-management.md](./10-ddos-mitigation-and-management.md) | [server.ts#L12-L17](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/server.ts#L12-L17) | Anti-Slowloris TCP socket timeouts (headersTimeout/keepAliveTimeout), 1MB payload ceiling, 15s global timeout, DB pool fast-fail, & Redis cache offloading. |
| 11 | **Log Aggregation & Security Monitoring** | [11-log-aggregation-and-monitoring.md](./11-log-aggregation-and-monitoring.md) | [middleware/auditLogMiddleware.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/auditLogMiddleware.ts) & [scripts/logManager.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/scripts/logManager.ts) | Penyatuan Access Logging telemetri & Audit Logging forensik, recursive auto-redaction secret/password/token, dual-tier write (Hot DB & Warm JSONL), dan kompresi Gzip. |
| 12 | **OAuth 2.0 & Social Sign-In Architecture** | [12-oauth2-and-social-login.md](./12-oauth2-and-social-login.md) | [modules/auth/auth.service.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/auth/auth.service.ts) | OpenID Connect token verification, audience check, enforcement email_verified, secure bcrypt dummy password, race condition P2002 handling, & audit logging. |
| 13 | **Multi-Factor Authentication (MFA / 2FA)** | [13-mfa-and-two-factor-authentication.md](./13-mfa-and-two-factor-authentication.md) | [modules/auth/advancedAuth.routes.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/auth/advancedAuth.routes.ts) | Standar TOTP RFC 6238, 2-step login handshake, anti-brute-force rate limiting, anti-replay lock via Redis, scoped challenge token (5m), & audit tracking. |
| 14 | **Health Checks & Deep System Probing** | [14-health-checks-and-system-probing.md](./14-health-checks-and-system-probing.md) | [modules/health/health.routes.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/health/health.routes.ts) | Proteksi pilar Availability (CIA Triad), deep dependency checking (PostgreSQL SELECT 1 & Redis PING), telemetri memori V8, dan isolasi otomatis load balancer. |
| 15 | **Secure File Upload & Processing** | [08-payload-management.md](../architecture/08-payload-management.md) | [uploadProductImageMiddleware.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/middleware/uploadProductImageMiddleware.ts) | Magic number file sniffing, pembatasan ekstensi WebP/JPEG, proteksi Path Traversal, & Sharp image reprocessing. |
| 16 | **Mass Assignment & Input Validation** | [11-unchecked-type-assertions.md](../performance/11-unchecked-type-assertions.md) | [order.validation.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/order/order.validation.ts) & [cart.validation.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/cart/cart.validation.ts) | Strict DTO Zod parsing, penolakan property asing (strip/strict), & sanitasi boundary payload. |
| 17 | **Payment Gateway Webhook & Idempotency** | [05-idempotency.md](../architecture/05-idempotency.md) | [payment.service.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/payment/payment.service.ts) | Midtrans HMAC SHA512 signature verification, header timestamp validity, & Redis idempotency key locks. |

---

## Quick Security Audit & Verification Cheatsheet

```bash
# Menjalankan audit kerentanan dependensi npm
npm audit

# Menjalankan linting kode untuk pola rentan (security rules)
npm run lint

# Menjalankan unit & integration tests modul autentikasi & keamanan
npm test

```bash
# Menjalankan backend server dalam mode production aman
npm run build && npm start
```

---

## Evaluasi & Ringkasan Gap Analysis Standar Industri (Batasan Mentok)

Sebagai Senior Backend Engineer, berikut adalah rekapitulasi evaluasi menyeluruh terhadap postur keamanan (*Security Posture*) platform **Nexa Streetwear** secara holistik dibanding standar enterprise / tier-1 fintech e-commerce:

### Ringkasan Status Kepatuhan & Gap Matrix

| Dokumen Modul | Status Produksi Saat Ini | Gap "Batasan Mentok" Utama yang Belum Diterapkan | Urgensi |
| :--- | :--- | :--- | :--- |
| **[01. SQL Injection](./01-sql-injection.md)** | ✅ 100% Parameterized | Database Least Privilege User (DCL) & Automated SQL Query Fingerprint Anomaly Detector. | P2 |
| **[02. Secrets Management](./02-environment-variables-and-secrets.md)** | ✅ Zod Validated + AES-256-GCM | Dedicated Cloud KMS (AWS KMS / HashiCorp Vault) & Automated Dynamic Secret Rotation. | P2 |
| **[03. JWT Lifecycle](./03-jwt-authentication-lifecycle.md)** | ✅ Dual-Token + Refresh Invalidation | Asymmetric EdDSA / RS256 with JWKS rotation endpoint & Instant Token Blacklist via Redis Bloom Filter. | P1 |
| **[04. CORS Policy](./04-cors-policy-and-origin-defense.md)** | ✅ Regex Whitelist + 24h MaxAge | Reverse Proxy Origin Stripping & Dynamic Cache Poisoning Defense (Vary: Origin). | P2 |
| **[05. SSL/TLS Transport](./05-ssl-tls-and-transport-security.md)** | ✅ HSTS Preload + Proxy HTTPS Redirect | Strict Root CA Validation pada Remote DB connection (`rejectUnauthorized: true`) & mTLS. | P1 |
| **[06. Rate Limiting](./06-rate-limiting-and-throttling.md)** | ✅ 3-Tier Multi-Limit + Redis INCR | Sliding Window Log (Anti Boundary Burst) & Dual-Key Throttling (IP + Account Identifier). | P1 |
| **[07. RBAC & Privilege](./07-role-based-access-control.md)** | ✅ Strict Ownership (Anti-BOLA) | Granular Permission-Based Access Control (PBAC) & Real-time Role Revocation Sync. | P1 |
| **[08. XSS & CSP](./08-xss-prevention-and-content-security.md)** | ✅ JSX Auto-Escape + HttpOnly | Strict Content Security Policy (CSP) with Nonces & Disallow SVG image upload. | P1 |
| **[09. CSRF & Cookies](./09-csrf-protection-and-cookie-defense.md)** | ✅ Double-Submit + Timing-Safe | Origin/Referer Header Enforcement & Cookie Prefixes (`__Host-` / `__Secure-`). | P1 |
| **[10. DDoS Mitigation](./10-ddos-mitigation-and-management.md)** | ✅ Anti-Slowloris + 15s Timeout | Adaptive Load Shedding (Lag Monitor) & Circuit Breaker pada payment gateway external. | P1 |
| **[11. Audit Logging](./11-audit-logging.md)** | ✅ Dual-Tier DB/JSONL + Auto-Redact | Cryptographic Hash Chaining (Merkle Integrity) & WORM Cloud Object Storage Lock (S3 Compliance). | P1 |
| **[12. OAuth 2.0](./12-oauth2-and-social-login.md)** | ✅ OIDC Verified + Bcrypt Dummy Hash | PKCE Flow Support, Account Unlinking Workflow, & Google RISC Security Webhooks. | P2 |
| **[13. MFA / 2FA](./13-mfa-and-two-factor-authentication.md)** | ✅ RFC 6238 TOTP + 2-Step Handshake | Emergency Backup Recovery Codes (Single-Use Hash) & FIDO2 / WebAuthn Passkeys. | P1 |

> [!TIP]
> Rincian teknis, analisis vektor serangan, dan panduan mitigasi lengkap untuk masing-masing gap di atas dapat dipelajari langsung di bab evaluasi pada setiap berkas dokumentasi individual terkait.
