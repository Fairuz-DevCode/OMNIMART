import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";

// Direktori penyimpanan log akses
const LOG_DIR = path.resolve(process.cwd(), "logs/access");

// Pastikan direktori ada
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

let currentDateStr = "";
let currentWriteStream: fs.WriteStream | null = null;

/**
 * Mendapatkan string tanggal hari ini format YYYY-MM-DD (UTC/Local)
 */
const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Mengambil atau membuat stream file aktif untuk hari ini
 */
const getLogStream = (): fs.WriteStream => {
  const today = getTodayDateString();

  if (currentWriteStream && currentDateStr === today && !currentWriteStream.destroyed) {
    return currentWriteStream;
  }

  // Jika tanggal berganti, tutup stream lama
  if (currentWriteStream && !currentWriteStream.destroyed) {
    currentWriteStream.end();
  }

  currentDateStr = today;
  const filePath = path.join(LOG_DIR, `access-${today}.log`);
  currentWriteStream = fs.createWriteStream(filePath, { flags: "a", encoding: "utf8" });

  currentWriteStream.on("error", (err) => {
    console.error("Access Log Stream Error:", err);
  });

  return currentWriteStream;
};

// Tutup stream dengan rapi saat server shutdown
const closeStream = () => {
  if (currentWriteStream && !currentWriteStream.destroyed) {
    currentWriteStream.end();
  }
};
process.on("SIGTERM", closeStream);
process.on("SIGINT", closeStream);

/**
 * Access Logging Middleware:
 * Merekam SEMUA HTTP request yang masuk (Network & Traffic monitoring)
 * dalam format JSON Lines (.jsonl) secara asinkron dan non-blocking.
 */
export const accessLogger = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = process.hrtime.bigint();

    res.on("finish", () => {
      try {
        const endTime = process.hrtime.bigint();
        const latencyMs = Number(endTime - startTime) / 1_000_000;

        const ip =
          (req.headers["cf-connecting-ip"] as string) ||
          (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
          req.ip ||
          req.socket.remoteAddress ||
          "unknown";

        const logEntry = {
          timestamp: new Date().toISOString(),
          method: req.method,
          url: req.originalUrl || req.url,
          status: res.statusCode,
          latency_ms: Math.round(latencyMs * 100) / 100,
          ip: String(ip),
          user_agent: req.headers["user-agent"] || "unknown",
          referrer: req.headers["referer"] || req.headers["referrer"] || null,
          content_length: res.getHeader("content-length")
            ? Number(res.getHeader("content-length"))
            : null,
          http_version: req.httpVersion,
        };

        const stream = getLogStream();
        stream.write(JSON.stringify(logEntry) + "\n");
      } catch (err) {
        // Jangan pernah biarkan logging crash menghentikan response server
        console.error("Failed to write access log:", err);
      }
    });

    next();
  };
};
