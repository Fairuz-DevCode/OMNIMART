# 05. Reverse Proxy & Edge Gateway: Arsitektur & Hardening

Dokumen ini membedah arsitektur **Reverse Proxy** (menggunakan Nginx / Traefik), mengapa aplikasi Node.js dilarang keras terekspos langsung ke internet publik tanpa perantara, serta konfigurasi *Edge Gateway* di project **Nexa Streetwear**.

---

## 1. Mengapa Node.js Dilarang Terpapar Langsung ke Internet Publik?

Dalam praktik *Production Engineering*, aplikasi Express / Node.js **tidak boleh dibuka langsung ke port 80/443 publik**. Selalu wajib ada **Reverse Proxy** di baris terdepan:

```
+---------------------------------------------------------------------------------+
| AKSES INTERNET PUBLIK                                                           |
| (Browser Pembeli, Mobile App, Bot Penyerang, Webhook)                           |
+---------------------------------------------------------------------------------+
                                       |
                                       v  (Port 80 HTTP / 443 HTTPS)
+---------------------------------------------------------------------------------+
| EDGE REVERSE PROXY (Nginx C-Engine / Kernel Space)                              |
| - SSL/TLS 1.3 Termination & HSTS Preload                                        |
| - Melayani Gambar Produk Statis via OS `sendfile` (0% Node.js CPU)              |
| - Buffer Request Lambat (Anti-Slowloris Protection)                             |
| - Edge Rate Limiting & Web Application Firewall (WAF)                           |
+---------------------------------------------------------------------------------+
                                       |
                                       v  (Internal Network / Port 5000 Loopback)
+---------------------------------------------------------------------------------+
| BACKEND NODE.JS (Nexa Express Application / User Space)                         |
| - Murni fokus mengeksekusi logika bisnis e-commerce, checkout, & database       |
+---------------------------------------------------------------------------------+
```

### 4 Bahaya Menjalankan Node.js Langsung di Internet Publik:
1. **Rentan Serangan Slowloris:** Node.js memiliki thread pool terbatas. Penyerang dapat membuka 1.000 koneksi TCP yang sengaja mengirim data header sangat lambat, membuat seluruh thread Node.js kehabisan soket. Nginx menyerap serangan ini dengan mem-buffer seluruh request sebelum meneruskannya ke Node.js.
2. **Kinerja Buruk Menyajikan File Statis:** Node.js memproses pembacaan gambar produk (`/uploads/hoodie.webp`) melalui event-loop V8 dan buffer RAM. Nginx menyajikan file langsung dari disk ke kartu jaringan via panggilan kernel **`sendfile`**, 10x lebih cepat tanpa memakan memori aplikasi.
3. **Privilege Escalation:** Port 80 dan 443 di Linux hanya bisa dibuka oleh pengguna `root`. Menjalankan aplikasi Node.js sebagai `root` adalah bencana keamanan: jika ada celah Remote Code Execution (RCE), penyerang langsung menguasai seluruh server OS.
4. **Beban Komputasi Kriptografi SSL:** Enkripsi/dekripsi HTTPS memakan waktu komputasi CPU yang tinggi jika dikerjakan di JavaScript V8.

---

## 2. Peran & Kemampuan Utama Reverse Proxy di Nexa

### A. SSL/TLS Termination & HTTP/2
* Mengelola sertifikat SSL Let's Encrypt secara otomatis via Certbot.
* Memfasilitasi protokol **HTTP/2 Multiplexing** (mengunduh puluhan aset gambar produk streetwear secara paralel dalam 1 koneksi TCP tunggal).

### B. Static Asset Offloading via Kernel `sendfile`
* Request aset foto produk (`/public/uploads/*`) langsung ditangani oleh Nginx tanpa pernah menyentuh proses Node.js.

### C. Buffer & Sanitasi Header
* Memvalidasi ukuran body (`client_max_body_size 10M;`) sebelum data masuk ke Node.js.
* Meneruskan IP asli pembeli ke backend via header `X-Forwarded-For` dan `X-Real-IP`.

---

## 3. Best Practices Rekayasa Reverse Proxy

1. **Aktifkan `sendfile on;` dan `tcp_nopush on;`:**  
   Mengalirkan paket data gambar langsung dari disk cache OS ke socket jaringan tanpa menyalin data ke user-space buffer.
2. **Aggressive Cache-Control pada Media Statis:**  
   Pasang header `Cache-Control: public, max-age=31536000, immutable` pada gambar produk agar browser pembeli menyimpan foto di disk lokalnya selama 1 tahun tanpa menembak server lagi.
3. **Hardening Keamanan Header:**  
   Pasang proteksi Clickjacking (`X-Frame-Options: SAMEORIGIN`) dan MIME-sniffing (`X-Content-Type-Options: nosniff`) langsung di level web server.
4. **WebSocket Connection Upgrade:**  
   Pastikan Nginx dikonfigurasi untuk meneruskan header `Upgrade` dan `Connection` untuk kebutuhan live order streaming.

---

## 4. Konfigurasi Nginx Production Lengkap untuk Nexa Streetwear

Simpan konfigurasi ini di `/etc/nginx/sites-available/nexa-streetwear.conf`:

```nginx
# 1. Redirect seluruh HTTP (Port 80) ke HTTPS (Port 443)
server {
    listen 80;
    listen [::]:80;
    server_name nexastreetwear.com www.nexastreetwear.com api.nexastreetwear.com;
    return 301 https://$host$request_uri;
}

# 2. Server Blok Utama HTTPS (Port 443)
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name nexastreetwear.com www.nexastreetwear.com api.nexastreetwear.com;

    # Sertifikat SSL Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/nexastreetwear.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nexastreetwear.com/privkey.pem;

    # Protokol Enkripsi Modern (TLS 1.2 & TLS 1.3)
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Batas Maksimal Upload Gambar Produk
    client_max_body_size 10M;

    # A. ASET GAMBAR PRODUK & STATIS (Dilayani LANGSUNG oleh Nginx via Sendfile)
    location /public/ {
        alias /opt/nexa-streetwear/backend/public/;
        sendfile on;
        tcp_nopush on;
        tcp_nodelay on;
        
        # Cache browser agresif selama 30 hari untuk gambar WebP
        expires 30d;
        add_header Cache-Control "public, no-transform";
        access_log off; # Jangan penuhi disk dengan log gambar statis
    }

    # B. API BACKEND NODE.JS (Reverse Proxy ke Port 5000)
    location / {
        proxy_pass http://127.0.0.1:5000;

        # Meneruskan Identitas Client Asli
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Dukungan WebSocket
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Buffer & Timeout Proteksi
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
        
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
        proxy_send_timeout 30s;
    }
}
```

---

## 5. Cheatsheet CLI Nginx & Operasional

```bash
# 1. Menguji keabsahan sintaks konfigurasi Nginx (Wajib sebelum reload!)
sudo nginx -t

# 2. Menerapkan perubahan konfigurasi tanpa mematikan server (Zero-Downtime Reload)
sudo systemctl reload nginx

# 3. Memantau log akses secara real-time
sudo tail -f /var/log/nginx/access.log

# 4. Memantau error log (untuk mendeteksi upstream timeout atau 502 bad gateway)
sudo tail -f /var/log/nginx/error.log

# 5. Memperbarui sertifikat SSL Let's Encrypt secara otomatis
sudo certbot renew --dry-run
```

---

## 6. Kesimpulan

Dengan memasang **Nginx sebagai Reverse Proxy di Depan Node.js**:
- Server backend Nexa kebal terhadap serangan lambat *Slowloris* dan *MIME-type spoofing*.
- Gambar produk dilayani dengan latensi mendekati 0 milidetik via optimasi kernel `sendfile`.
- Aplikasi Node.js berjalan secara aman sebagai pengguna non-root di lingkungan internal terisolasi.
