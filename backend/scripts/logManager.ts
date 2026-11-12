import fs from "fs";
import path from "path";
import zlib from "zlib";
import { pipeline } from "stream/promises";
import prisma from "../src/config/prisma.js";

// Direktori log
const BASE_LOG_DIR = path.resolve(process.cwd(), "logs");
const ACCESS_LOG_DIR = path.join(BASE_LOG_DIR, "access");
const AUDIT_LOG_DIR = path.join(BASE_LOG_DIR, "audit");
const ARCHIVE_DIR = path.join(BASE_LOG_DIR, "archive");

// Kebijakan retensi default
const DB_RETENTION_DAYS = 30; // 30 hari di PostgreSQL (Hot Storage)
const COLD_RETENTION_DAYS = 365; // 365 hari di disk / cold storage

const ensureDirs = () => {
  [BASE_LOG_DIR, ACCESS_LOG_DIR, AUDIT_LOG_DIR, ARCHIVE_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * 1. Kompresi file harian kemarin (.log / .jsonl -> .gz)
 */
export const compressDailyLogs = async () => {
  ensureDirs();
  const today = getTodayDateString();
  const targetDirs = [ACCESS_LOG_DIR, AUDIT_LOG_DIR];

  console.log("\n📦 [1/4] Memulai Kompresi Log Harian...");
  let totalSavedBytes = 0;
  let compressedCount = 0;

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir);
    for (const file of files) {
      // Lewati file yang sedang aktif hari ini atau yang sudah terkompresi .gz
      if (file.includes(today) || file.endsWith(".gz") || file.startsWith(".")) {
        continue;
      }

      if (file.endsWith(".log") || file.endsWith(".jsonl")) {
        const sourcePath = path.join(dir, file);
        const targetPath = `${sourcePath}.gz`;

        const originalStat = fs.statSync(sourcePath);
        if (originalStat.size === 0) {
          // Jika kosong, hapus saja
          fs.unlinkSync(sourcePath);
          continue;
        }

        const sourceStream = fs.createReadStream(sourcePath);
        const gzipStream = zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });
        const targetStream = fs.createWriteStream(targetPath);

        await pipeline(sourceStream, gzipStream, targetStream);

        const compressedStat = fs.statSync(targetPath);
        const saved = originalStat.size - compressedStat.size;
        const ratio = ((saved / originalStat.size) * 100).toFixed(1);

        // Hapus file asli yang belum dikompresi
        fs.unlinkSync(sourcePath);

        totalSavedBytes += saved;
        compressedCount++;

        console.log(
          `  ✓ Berhasil kompresi: ${file} (${formatBytes(originalStat.size)}) -> ${path.basename(
            targetPath
          )} (${formatBytes(compressedStat.size)}) | Hemat ${ratio}%`
        );
      }
    }
  }

  if (compressedCount === 0) {
    console.log("  ℹ Tidak ada file log lama yang perlu dikompresi hari ini.");
  } else {
    console.log(
      `  🎉 Selesai: ${compressedCount} file dikompresi. Total ruang hemat: ${formatBytes(
        totalSavedBytes
      )}.`
    );
  }
};

/**
 * 2. Konsolidasi bulanan: Mengelompokkan file .gz bulan lalu ke folder arsip
 */
export const bundleMonthlyArchives = async () => {
  ensureDirs();
  const currentYearMonth = getTodayDateString().slice(0, 7); // YYYY-MM saat ini

  console.log("\n🗂️  [2/4] Mengevaluasi Konsolidasi Bulanan...");
  const targetDirs = [ACCESS_LOG_DIR, AUDIT_LOG_DIR];
  const monthlyGroups: Record<string, string[]> = {};

  for (const dir of targetDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);

    for (const file of files) {
      if (!file.endsWith(".gz")) continue;

      // Ambil pola YYYY-MM dari nama file (misal: access-2026-10-14.log.gz)
      const match = file.match(/\d{4}-\d{2}/);
      if (match) {
        const fileYearMonth = match[0];
        // Hanya bundel bulan yang sudah lewat (bukan bulan berjalan)
        if (fileYearMonth < currentYearMonth) {
          const key = `${path.basename(dir)}_${fileYearMonth}`;
          if (!monthlyGroups[key]) monthlyGroups[key] = [];
          monthlyGroups[key].push(path.join(dir, file));
        }
      }
    }
  }

  const groupKeys = Object.keys(monthlyGroups);
  if (groupKeys.length === 0) {
    console.log("  ℹ Tidak ada file bulan lampau yang perlu dikonsolidasikan.");
    return;
  }

  for (const key of groupKeys) {
    const files = monthlyGroups[key];
    const monthArchiveDir = path.join(ARCHIVE_DIR, key);
    if (!fs.existsSync(monthArchiveDir)) {
      fs.mkdirSync(monthArchiveDir, { recursive: true });
    }

    for (const filePath of files) {
      const dest = path.join(monthArchiveDir, path.basename(filePath));
      fs.renameSync(filePath, dest);
    }

    console.log(
      `  ✓ ${files.length} file log bulan lampau dipindahkan ke arsip: ${path.relative(
        process.cwd(),
        monthArchiveDir
      )}`
    );
  }
};

/**
 * 3. Database Audit Pruning: Export & hapus audit_logs PostgreSQL > 30 hari
 */
export const pruneDatabaseAuditLogs = async (retentionDays = DB_RETENTION_DAYS) => {
  ensureDirs();
  console.log(`\n🧹 [3/4] Database Audit Pruning (Ambang Batas: ${retentionDays} hari)...`);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // 1. Cek jumlah data lama
  const countOldLogs = await prisma.audit_logs.count({
    where: {
      created_at: {
        lt: cutoffDate,
      },
    },
  });

  if (countOldLogs === 0) {
    console.log("  ℹ Tidak ada data audit log di database yang melebihi batas retensi.");
    return;
  }

  console.log(`  Found ${countOldLogs} baris data audit log lama. Memulai ekspor arsip...`);

  // 2. Ekspor ke file arsip terkompresi sebelum dihapus (Zero Data Loss)
  const archiveFileName = `db-audit-pruned-${getTodayDateString()}-${Date.now()}.jsonl.gz`;
  const archiveFilePath = path.join(ARCHIVE_DIR, archiveFileName);

  const gzipStream = zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });
  const fileStream = fs.createWriteStream(archiveFilePath);
  gzipStream.pipe(fileStream);

  // Ambil data dalam batch 1000 record agar hemat memori
  const BATCH_SIZE = 1000;
  let cursorId: number | undefined = undefined;
  let exportedCount = 0;

  while (true) {
    const records = await prisma.audit_logs.findMany({
      where: {
        created_at: { lt: cutoffDate },
        ...(cursorId ? { id: { gt: cursorId } } : {}),
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
    });

    if (records.length === 0) break;

    for (const record of records) {
      gzipStream.write(JSON.stringify(record) + "\n");
    }

    exportedCount += records.length;
    cursorId = records[records.length - 1].id;

    if (records.length < BATCH_SIZE) break;
  }

  gzipStream.end();
  await new Promise((resolve) => fileStream.on("finish", resolve));

  const archiveStat = fs.statSync(archiveFilePath);
  console.log(
    `  ✓ Berhasil mengekspor ${exportedCount} baris ke: ${path.basename(
      archiveFilePath
    )} (${formatBytes(archiveStat.size)})`
  );

  // 3. Hapus data dari tabel PostgreSQL
  const deleteResult = await prisma.audit_logs.deleteMany({
    where: {
      created_at: {
        lt: cutoffDate,
      },
    },
  });

  console.log(`  ✓ Berhasil menghapus ${deleteResult.count} baris dari tabel PostgreSQL.`);
};

/**
 * 4. Pembersihan arsip kadaluarsa (> 365 hari / batas regulasi)
 */
export const purgeExpiredArchives = async (maxDays = COLD_RETENTION_DAYS) => {
  ensureDirs();
  console.log(`\n⏳ [4/4] Memeriksa Arsip Kadaluarsa (> ${maxDays} hari)...`);

  const cutoffTime = Date.now() - maxDays * 24 * 60 * 60 * 1000;
  let purgedCount = 0;

  const inspectAndPurge = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        inspectAndPurge(fullPath);
        // Hapus folder jika sudah kosong
        if (fs.readdirSync(fullPath).length === 0) {
          fs.rmdirSync(fullPath);
        }
      } else {
        const stat = fs.statSync(fullPath);
        if (stat.mtimeMs < cutoffTime) {
          fs.unlinkSync(fullPath);
          purgedCount++;
          console.log(`  🗑️ Dihapus permanen (expired): ${entry.name}`);
        }
      }
    }
  };

  inspectAndPurge(ARCHIVE_DIR);

  if (purgedCount === 0) {
    console.log("  ℹ Tidak ada file arsip yang melebihi umur maksimal.");
  } else {
    console.log(`  ✓ ${purgedCount} file arsip kadaluarsa berhasil dibersihkan.`);
  }
};

/**
 * Status Ringkasan Log & Disk Space
 */
export const showLogStatus = async () => {
  ensureDirs();
  console.log("\n📊 Ringkasan Status Log Nexa Storefront:");

  const getDirStats = (dir: string) => {
    if (!fs.existsSync(dir)) return { count: 0, totalSize: 0 };
    let count = 0;
    let totalSize = 0;

    const traverse = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          traverse(fullPath);
        } else {
          count++;
          totalSize += fs.statSync(fullPath).size;
        }
      }
    };

    traverse(dir);
    return { count, totalSize };
  };

  const accessStats = getDirStats(ACCESS_LOG_DIR);
  const auditStats = getDirStats(AUDIT_LOG_DIR);
  const archiveStats = getDirStats(ARCHIVE_DIR);

  const dbAuditCount = await prisma.audit_logs.count();

  console.log(`  • Access Logs (Disk)   : ${accessStats.count} files | ${formatBytes(accessStats.totalSize)}`);
  console.log(`  • Audit Logs (Disk)    : ${auditStats.count} files | ${formatBytes(auditStats.totalSize)}`);
  console.log(`  • Cold Archive (Disk)  : ${archiveStats.count} files | ${formatBytes(archiveStats.totalSize)}`);
  console.log(`  • Hot Audit Logs (DB)  : ${dbAuditCount} baris di tabel PostgreSQL`);
  console.log(`  • Total Storage di Disk: ${formatBytes(accessStats.totalSize + auditStats.totalSize + archiveStats.totalSize)}\n`);
};

// Eksekusi CLI
const run = async () => {
  const args = process.argv.slice(2);
  const command = args[0] || "--all";

  try {
    if (command === "--status") {
      await showLogStatus();
    } else if (command === "--rotate") {
      await compressDailyLogs();
    } else if (command === "--bundle") {
      await bundleMonthlyArchives();
    } else if (command === "--prune") {
      await pruneDatabaseAuditLogs();
    } else if (command === "--purge") {
      await purgeExpiredArchives();
    } else if (command === "--all") {
      console.log("🚀 Menjalankan Pipeline Lengkap Pemeliharaan Log & Kompresi...");
      await compressDailyLogs();
      await bundleMonthlyArchives();
      await pruneDatabaseAuditLogs();
      await purgeExpiredArchives();
      await showLogStatus();
    } else {
      console.log(`Perintah tidak dikenal: ${command}`);
      console.log("Gunakan: --all, --rotate, --bundle, --prune, --purge, atau --status");
    }
  } catch (err) {
    console.error("❌ Terjadi kesalahan pada Log Manager:", err);
  } finally {
    await prisma.$disconnect();
  }
};

import { fileURLToPath } from "url";

const isMainModule = () => {
  if (!process.argv[1]) return false;
  try {
    return fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
  } catch {
    return false;
  }
};

if (isMainModule()) {
  run();
}
