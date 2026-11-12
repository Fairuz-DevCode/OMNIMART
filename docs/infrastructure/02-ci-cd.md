# 02. CI/CD Pipeline: Continuous Integration & Deployment

Dokumen ini membedah arsitektur **CI/CD (Continuous Integration & Continuous Deployment)**, siklus pengujian otomatis, migrasi database nir-henti (*zero-downtime database migration*), serta implementasi pipeline di project **Nexa Streetwear**.

---

## 1. Mengapa CI/CD Krusial untuk E-Commerce?

Dalam pengembangan software komersial, merilis fitur atau perbaikan bug secara manual (menggunakan FTP, Git pull langsung di server VPS, atau SSH manual) memiliki risiko tinggi:
* **Human Error:** Developer lupa menjalankan migrasi database atau lupa meng-compile TypeScript, menyebabkan server *crash* seketika.
* **Regression Bugs:** Perubahan kode pada modul produk tanpa sengaja merusak alur checkout order tanpa disadari.
* **Downtime Deployment:** Website toko online offline selama 2–5 menit saat developer menjalankan `npm install` dan `npm run build` di server VPS produksi yang memakan 100% CPU.

```mermaid
flowchart LR
    Dev["Developer Git Push"] --> Lint["1. Lint & Typecheck (tsc)"]
    Lint --> Test["2. Automated Tests (Jest)"]
    Test --> Security["3. Security Scan (npm audit)"]
    Security --> Build["4. Build Docker Image (Multi-Stage)"]
    Build --> Deploy["5. Zero-Downtime Deploy (VPS / K8s)"]

    style Lint fill:#e3f2fd,stroke:#1565c0
    style Test fill:#e3f2fd,stroke:#1565c0
    style Security fill:#e3f2fd,stroke:#1565c0
    style Build fill:#fff3e0,stroke:#e65100
    style Deploy fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
```

Dengan pipeline CI/CD otomatis, setiap baris kode yang di-push ke GitHub diverifikasi secara ketat dalam *isolated environment*. Jika ada tes yang gagal, deployment otomatis dibatalkan (*auto-abort*), menjaga server produksi tetap aman 100%.

---

## 2. 5 Tahapan Pipeline CI/CD Nexa Streetwear

### Tahap 1: Verifikasi Tipe & Linting (Static Analysis)
* Memeriksa seluruh codebase menggunakan compiler TypeScript tanpa menghasilkan berkas output (`tsc --noEmit`).
* Menjamin tidak ada kesalahan nama properti atau `any` yang lolos ke produksi.

### Tahap 2: Pengujian Otomatis (Automated Testing Suite)
* Menjalankan unit test untuk kalkulasi diskon, ongkir, dan hashing token.
* Menyalakan database PostgreSQL dan Redis sementara via *GitHub Actions Service Containers* untuk menguji transaksi checkout secara nyata via Supertest.

### Tahap 3: Pemindaian Keamanan (Dependency Security Audit)
* Menjalankan `npm audit --production` untuk mendeteksi kerentanan CVE pada library pihak ketiga.
* Menjalankan pemindaian rahasia untuk memastikan tidak ada API Key Midtrans atau password DB yang tidak sengaja ter-commit ke Git.

### Tahap 4: Pembuatan Image Docker (Automated Build & Push)
* Membangun image Docker menggunakan cache layer GitHub Actions.
* Memberi tag versi berbasis Git Commit SHA (`ghcr.io/nexa/backend:sha-abc1234`) dan mengunggahnya ke GitHub Container Registry (GHCR).

### Tahap 5: Deployment Otomatis Tanpa Downtime
* Menghubungi server produksi via SSH Key aman atau webhook.
* Menjalankan migrasi database: `npx prisma migrate deploy`.
* Melakukan *rolling restart* kontainer baru: kontainer lama baru dimatikan setelah kontainer baru lolos *healthcheck* (`/api/health`).

---

## 3. Best Practices Rekayasa CI/CD

1. **Pisahkan Database Migration dari Build Image:**  
   Jangan pernah menjalankan migrasi database di dalam Dockerfile `RUN`. Eksekusi migrasi saat proses deployment sebelum kontainer baru menerima traffic.
2. **Backward-Compatible Database Migrations (Expand and Contract):**  
   Saat menambah atau mengubah kolom database, pastikan perubahan skema mendukung kode backend versi lama dan versi baru secara bersamaan agar tidak terjadi error saat *rolling update*.
3. **Secret Masking:**  
   Seluruh kredensial sensitif (`DATABASE_URL`, `JWT_SECRET`, `MIDTRANS_SERVER_KEY`) wajib disimpan di **GitHub Repository Secrets**, tidak boleh tertulis di file YAML workflow.
4. **Fail-Fast Strategy:**  
   Susun tahapan yang paling cepat (Typecheck & Linting ~15 detik) di awal, sehingga developer langsung mendapatkan notifikasi eror tanpa harus menunggu proses testing yang lebih lama.

---

## 4. Implementasi Nyata di Codebase Nexa Streetwear

Berikut adalah konfigurasi pipeline CI/CD siap pakai menggunakan **GitHub Actions** yang dirancang untuk arsitektur Nexa:

### Template File Workflow: `.github/workflows/ci-cd.yml`

```yaml
name: Nexa Streetwear CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  # JOB 1: Continuous Integration (Pengujian & Audit)
  test-and-verify:
    name: Lint, Test, & Audit
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
          POSTGRES_DB: db_nexa_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - name: Checkout Codebase
        uses: actions/checkout@v4

      - name: Setup Node.js Runtime
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"
          cache-dependency-path: backend/package-lock.json

      - name: Install Dependencies
        working-directory: ./backend
        run: npm ci

      - name: TypeScript Strict Typecheck
        working-directory: ./backend
        run: npx tsc --noEmit

      - name: Run Prisma Database Migration on Test DB
        working-directory: ./backend
        env:
          DATABASE_URL: "postgresql://test_user:test_password@localhost:5432/db_nexa_test"
        run: npx prisma migrate deploy

      - name: Execute Automated Unit & Integration Tests
        working-directory: ./backend
        env:
          DATABASE_URL: "postgresql://test_user:test_password@localhost:5432/db_nexa_test"
          REDIS_HOST: localhost
          REDIS_PORT: 6379
          JWT_SECRET: "test_secret_key_minimum_32_characters_long_for_security"
          NODE_ENV: test
        run: npm run test

      - name: Security Vulnerability Audit
        working-directory: ./backend
        run: npm audit --audit-level=high

  # JOB 2: Continuous Deployment (Hanya jalan jika branch main & lolos Job 1)
  deploy:
    name: Build Docker & Deploy to Production
    needs: test-and-verify
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Codebase
        uses: actions/checkout@v4

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and Push Production Docker Image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/backend:latest
            ghcr.io/${{ github.repository }}/backend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy to VPS Server via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.PROD_SERVER_IP }}
          username: ${{ secrets.PROD_SERVER_USER }}
          key: ${{ secrets.PROD_SSH_PRIVATE_KEY }}
          script: |
            cd /opt/nexa-streetwear
            docker compose pull api
            docker compose run --rm api npx prisma migrate deploy
            docker compose up -d --no-deps api
            docker image prune -f
```

---

## 5. Cheatsheet & Pengujian Lokal Sebelum Push

Sebelum melakukan `git push`, developer disarankan menjalankan rantai verifikasi lokal berikut:

```bash
# 1. Jalankan pemeriksaan tipe statis
npm run build -- --noEmit

# 2. Jalankan seluruh test suite
npm run test:unit
npm run test:integration

# 3. Jalankan audit dependensi
npm audit

# 4. Uji coba build Docker multi-stage secara lokal
docker build -t nexa-backend:local ./backend
```

---

## 6. Kesimpulan

Dengan menerapkan **CI/CD Pipeline Otomatis**:
- Kualitas kode terjamin sebelum menyentuh server klien (Zero Broken Code in Production).
- Migrasi skema database dijalankan secara terisolasi dan deterministik.
- Proses rilis fitur baru dapat dilakukan puluhan kali sehari dalam hitungan menit tanpa mengganggu pembeli yang sedang berbelanja di website.
