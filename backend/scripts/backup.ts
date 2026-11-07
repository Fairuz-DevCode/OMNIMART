import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import pg from "pg";
import env from "../src/config/env.js";

const { Client } = pg;
const backupDir = path.join(process.cwd(), "backups");

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const restorePointLabel = `rp_${env.DB_NAME}_${timestamp}`;
const backupFile = path.join(backupDir, `db_backup_${env.DB_NAME}_${timestamp}.dump`);
const metaFile = path.join(backupDir, `db_backup_${env.DB_NAME}_${timestamp}.meta.json`);

async function runBackup() {
  console.log("==================================================");
  console.log(`Starting PostgreSQL Base Snapshot & PITR Point`);
  console.log(`Database: ${env.DB_NAME} on ${env.DB_HOST}:${env.DB_PORT}`);
  console.log("==================================================");

  let walLsn: string | null = null;

  // 1. Catat WAL LSN & Buat Restore Point atomik di PostgreSQL
  const client = new Client({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  });

  try {
    await client.connect();
    const res = await client.query(
      "SELECT pg_create_restore_point($1) AS restore_point, pg_current_wal_lsn()::text AS lsn",
      [restorePointLabel]
    );
    walLsn = res.rows[0]?.lsn || null;
    console.log(`Registered WAL Restore Point: ${restorePointLabel}`);
    console.log(`Current WAL Log Sequence Number (LSN): ${walLsn}`);
  } catch (err: any) {
    console.warn(`Notice: Could not register restore point via SQL (${err.message}). Proceeding with binary dump.`);
  } finally {
    await client.end().catch(() => {});
  }

  // 2. Jalankan pg_dump format kustom biner (-F c)
  const args = [
    "-h", env.DB_HOST,
    "-p", String(env.DB_PORT),
    "-U", env.DB_USER,
    "-d", env.DB_NAME,
    "-F", "c",
    "-b",
    "-v",
    "-f", backupFile,
  ];

  const pgDumpProcess = spawn("pg_dump", args, {
    env: {
      ...process.env,
      PGPASSWORD: env.DB_PASSWORD,
    },
  });

  pgDumpProcess.on("close", (code) => {
    if (code !== 0) {
      console.error(`Database backup failed with exit code: ${code}`);
      process.exit(1);
    }

    const fileSizeMB = (fs.statSync(backupFile).size / (1024 * 1024)).toFixed(2);
    console.log(`Database snapshot created successfully! (${fileSizeMB} MB)`);
    console.log(`Output: ${backupFile}`);

    // 3. Simpan Metadata PITR JSON
    const metadata = {
      database: env.DB_NAME,
      timestamp: new Date().toISOString(),
      backup_file: path.basename(backupFile),
      size_mb: Number(fileSizeMB),
      restore_point: restorePointLabel,
      wal_lsn: walLsn,
    };

    fs.writeFileSync(metaFile, JSON.stringify(metadata, null, 2), "utf-8");
    console.log(`PITR Metadata saved: ${metaFile}`);

    // 4. Bersihkan backup lama yang lebih dari 7 hari
    cleanOldBackups(backupDir, 7);
    console.log("==================================================");
    process.exit(0);
  });

  pgDumpProcess.on("error", (error) => {
    console.error("Process failed to start:", error.message);
    process.exit(1);
  });
}

function cleanOldBackups(dir: string, daysToKeep: number) {
  const files = fs.readdirSync(dir);
  const now = Date.now();
  const msInDay = 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      const ageInDays = (now - stat.mtimeMs) / msInDay;
      if (ageInDays > daysToKeep) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
  });

  if (deletedCount > 0) {
    console.log(`Deleted ${deletedCount} old backup file(s) (older than ${daysToKeep} days).`);
  }
}

runBackup();
