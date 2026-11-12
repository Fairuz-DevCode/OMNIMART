# Infrastructure & DevOps Architecture Guide

Folder ini memuat dokumentasi arsitektur infrastruktur, *containerization*, *pipeline automations*, manajemen *traffic gateway*, dan orkestrasi AI di project **Nexa Streetwear E-Commerce**.

Setiap panduan membedah **Masalah Operasional / Skalabilitas**, **Solusi Teoretis & Best Practice**, serta **Implementasi Nyata di Codebase Project Ini**.

---

## Daftar Panduan Infrastruktur

| No | Topik Infrastruktur | Dokumen | Implementasi di Codebase | Ringkasan Penerapan |
|:---|:---|:---|:---|:---|
| 01 | **Docker & Containerization** | [01-docker.md](./01-docker.md) | [backend/Dockerfile](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/Dockerfile) & [docker-compose.yml](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/docker-compose.yml) | Multi-Stage Build Node.js 22 Alpine (<180MB), Docker Compose orchestration (PostgreSQL 16, PgBouncer, Redis, Express API), dan healthchecks. |
| 02 | **CI/CD Pipeline** | [02-ci-cd.md](./02-ci-cd.md) | [.github/workflows/ci-cd.yml](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/.github/workflows/ci-cd.yml) | GitHub Actions workflow: TypeScript strict typecheck, Prisma automated migration, Jest test suite, vulnerability audit, dan zero-downtime SSH deploy. |
| 03 | **Kubernetes (K8s)** | [03-kubernetes.md](./03-kubernetes.md) | [k8s/backend-deployment.yaml](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/k8s/backend-deployment.yaml) | Orkestrasi kluster skala besar, Horizontal Pod Autoscaler (HPA), Liveness & Readiness Probes, Rolling Updates (`maxUnavailable: 0`), dan manifest produksi. |
| 04 | **Load Balancing** | [04-load-balancing.md](./04-load-balancing.md) | [nginx/nginx.conf#L11-L16](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/nginx/nginx.conf#L11-L16) & [health.routes.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/modules/health/health.routes.ts) | Layer 4 TCP vs Layer 7 HTTP Load Balancer, algoritma Least Connections, health checks aktif, SSL termination, dan eliminasi Sticky Sessions. |
| 05 | **Reverse Proxy & Edge Gateway** | [05-reverse-proxy.md](./05-reverse-proxy.md) | [nginx/nginx.conf#L23-L49](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/nginx/nginx.conf#L23-L49) & [app.ts#L42](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/app.ts#L42) | Nginx edge server, proteksi Slowloris, isolasi non-root, pemrosesan media via kernel `sendfile` (0% CPU Node.js), dan mitigasi HTTP header spoofing. |
| 06 | **API Gateway & Routing Architecture** | [06-api-gateway.md](./06-api-gateway.md) | [backend/src/app.ts](file:///home/allrole/Documents/Learning/Streetwear%20|%20E-commerce%20Project/backend/src/app.ts) | Single Entry Point pattern, modular domain routing, pemusatan cross-cutting concerns (Rate Limiting, Helmet, Telemetry, Error Masking), dan Reverse Proxy Trust. |

---

## Quick Infrastructure Verification Cheatsheet

```bash
# 1. Menjalankan seluruh stack layanan di server lokal/staging
docker compose up -d

# 2. Memeriksa status kesehatan kontainer
docker compose ps

# 3. Menguji konfigurasi web server Nginx
sudo nginx -t

# 4. Menerapkan manifest ke kluster Kubernetes
kubectl apply -f k8s/backend-deployment.yaml

# 5. Memeriksa metrik utilisasi kontainer secara real-time
docker stats
```
