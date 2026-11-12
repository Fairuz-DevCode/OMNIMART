import fs from "fs";
import path from "path";

// Pola ekspresi reguler pendeteksi kebocoran kredensial (Secret Scanners)
const SECRET_RULES: { name: string; regex: RegExp }[] = [
  {
    name: "Private Cryptographic Key",
    regex: /-----BEGIN (?:RSA|EC|DSA|OPENSSH|PGP) PRIVATE KEY-----/,
  },
  {
    name: "AWS Access Key ID",
    regex: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    name: "Google API / OAuth Key",
    regex: /\bAIzaSy[0-9A-Za-z\-_]{33}\b/,
  },
  {
    name: "Midtrans Server Key (Live/Sandbox)",
    regex: /\b(?:SB-Mid-server|Mid-server)-[a-zA-Z0-9_-]{20,}\b/,
  },
  {
    name: "Stripe Live Secret Key",
    regex: /\b(?:sk_live|rk_live)_[0-9a-zA-Z]{24,}\b/,
  },
  {
    name: "Slack Incoming Webhook",
    regex: /https:\/\/hooks\.slack\.com\/services\/T[0-9A-Za-z_]+\/B[0-9A-Za-z_]+\/[0-9A-Za-z_]+/,
  },
  {
    name: "Hardcoded Database Connection String with Credentials",
    regex: /postgres(?:ql)?:\/\/[a-zA-Z0-9_]+:(?!password|dummy|\$)[^@\s\/"']+@[a-zA-Z0-9.-]+/,
  },
  {
    name: "Hardcoded High-Entropy Secret in Code",
    regex: /(?:JWT_SECRET|API_KEY|APP_SECRET)\s*[:=]\s*["'][a-zA-Z0-9_\-]{32,}["']/i,
  },
];

// Folder dan file yang dikecualikan dari scanning
const IGNORED_PATHS = [
  "node_modules",
  ".git",
  "dist",
  "coverage",
  "logs",
  ".env", // File .env lokal diabaikan karena sudah masuk karantina .gitignore
  ".env.example",
  "package-lock.json",
  "scanSecrets.ts", // File ini sendiri memuat regex pattern
];

const scanDirectory = (dir: string, results: { file: string; line: number; rule: string; snippet: string }[]) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(process.cwd(), fullPath);

    if (IGNORED_PATHS.some((ignored) => relPath.includes(ignored))) {
      continue;
    }

    if (entry.isDirectory()) {
      scanDirectory(fullPath, results);
    } else if (entry.isFile()) {
      // Hanya scan file teks kode / config
      const ext = path.extname(entry.name).toLowerCase();
      if ([".ts", ".js", ".json", ".yml", ".yaml", ".env", ".sql", ".md"].includes(ext) || entry.name.startsWith(".env")) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          const lines = content.split("\n");

          lines.forEach((lineText, index) => {
            // Lewati komentar penjelasan regex atau file contoh
            if (lineText.includes("AIzaSy") && lineText.includes("demo-client-id")) return;

            for (const rule of SECRET_RULES) {
              if (rule.regex.test(lineText)) {
                // Sensor snippet agar tidak membocorkan rahasia di terminal output
                const matched = lineText.match(rule.regex);
                const rawMatch = matched ? matched[0] : "";
                const maskedMatch = rawMatch.slice(0, 4) + "..." + rawMatch.slice(-4);
                const safeSnippet = lineText.replace(rawMatch, `[MASKED: ${maskedMatch}]`).trim();

                results.push({
                  file: relPath,
                  line: index + 1,
                  rule: rule.name,
                  snippet: safeSnippet.slice(0, 100),
                });
              }
            }
          });
        } catch {
          // Lewati file binary jika ada
        }
      }
    }
  }
};

const run = () => {
  console.log("🔍 [Secrets Scanner] Memulai pemindaian kode untuk mendeteksi potensi kebocoran kunci rahasia...\n");

  const results: { file: string; line: number; rule: string; snippet: string }[] = [];
  scanDirectory(process.cwd(), results);

  if (results.length === 0) {
    console.log("✅ BERSIH! Tidak ditemukan kunci rahasia, token API, atau private key yang bocor di kode sumber.\n");
    process.exit(0);
  } else {
    console.error(`🚨 PERINGATAN KEAMANAN: Ditemukan ${results.length} potensi kebocoran kredensial rahasia!\n`);
    for (const item of results) {
      console.error(`  ❌ [${item.rule}]`);
      console.error(`     File : ${item.file}:${item.line}`);
      console.error(`     Kode : ${item.snippet}\n`);
    }
    console.error("⛔ Segera pindahkan kunci rahasia tersebut ke file .env atau Vault sebelum melakukan commit Git!\n");
    process.exit(1);
  }
};

run();
