import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import env from "../src/config/env.js";

const backupDir = path.join(process.cwd(), "backups");

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = path.join(backupDir, `db_backup_${env.DB_NAME}_${timestamp}.dump`);

console.log(`Starting automated PostgreSQL backup to: ${backupFile}`);

const args = [
  "-h", env.DB_HOST,
  "-p", String(env.DB_PORT),
  "-U", env.DB_USER,
  "-d", env.DB_NAME,
  "-F", "c", 
  "-b",      
  "-v",      
  "-f", backupFile
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
  console.log("Database snapshot created successfully!");
  console.log(`File size: ${fileSizeMB} MB`);

  cleanOldBackups(backupDir, 7); 

  process.exit(0);
});

pgDumpProcess.on("error", (error) => {
  console.error("Process failed to start:", error.message);
  process.exit(1);
});

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