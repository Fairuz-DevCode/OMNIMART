import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import prisma from "../config/prisma.js";

// Direktori warm file audit log
const AUDIT_LOG_DIR = path.resolve(process.cwd(), "logs/audit");
if (!fs.existsSync(AUDIT_LOG_DIR)) {
  fs.mkdirSync(AUDIT_LOG_DIR, { recursive: true });
}

let currentDateStr = "";
let currentAuditStream: fs.WriteStream | null = null;

const getTodayDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getAuditStream = (): fs.WriteStream => {
  const today = getTodayDateString();
  if (currentAuditStream && currentDateStr === today && !currentAuditStream.destroyed) {
    return currentAuditStream;
  }

  if (currentAuditStream && !currentAuditStream.destroyed) {
    currentAuditStream.end();
  }

  currentDateStr = today;
  const filePath = path.join(AUDIT_LOG_DIR, `audit-${today}.jsonl`);
  currentAuditStream = fs.createWriteStream(filePath, { flags: "a", encoding: "utf8" });

  currentAuditStream.on("error", (err) => {
    console.error("Audit Log Stream Error:", err);
  });

  return currentAuditStream;
};

// Daftar key sensitif yang wajib di-masking
const SENSITIVE_KEYS = new Set([
  "password",
  "confirm_password",
  "token",
  "refresh_token",
  "access_token",
  "authorization",
  "secret",
  "cvv",
  "card_number",
  "otp",
  "pin",
]);

/**
 * Melakukan sensor rekursif terhadap data sensitif agar tidak bocor ke log
 */
export const sanitizeData = (data: any): any => {
  if (!data || typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
};

export interface AuditEventParams {
  userId?: number | null;
  action: string;
  method?: string;
  path?: string;
  statusCode?: number;
  ip?: string;
  userAgent?: string;
  resourceType?: string;
  resourceId?: string | number;
  changes?: {
    before?: any;
    after?: any;
  };
  details?: Record<string, any>;
}

/**
 * Programmatic Audit Logger:
 * Digunakan untuk mencatat audit event penting dari Service/Controller
 * lengkap dengan perubahan nilai (before/after).
 */
export const recordAuditEvent = async (params: AuditEventParams) => {
  try {
    const timestamp = new Date().toISOString();
    const sanitizedChanges = params.changes
      ? {
          before: sanitizeData(params.changes.before),
          after: sanitizeData(params.changes.after),
        }
      : undefined;

    const sanitizedDetails = {
      ...sanitizeData(params.details || {}),
      ...(sanitizedChanges ? { changes: sanitizedChanges } : {}),
      ...(params.resourceType ? { resource_type: params.resourceType } : {}),
      ...(params.resourceId ? { resource_id: String(params.resourceId) } : {}),
    };

    // 1. Hot Storage: Simpan ke PostgreSQL via Prisma
    const dbPromise = prisma.audit_logs.create({
      data: {
        user_id: params.userId ? Number(params.userId) : null,
        action: params.action.slice(0, 100),
        method: (params.method || "EVENT").slice(0, 10),
        path: (params.path || "system").slice(0, 255),
        status_code: params.statusCode || 200,
        ip_address: String(params.ip || "127.0.0.1").slice(0, 50),
        user_agent: params.userAgent || "internal",
        details: sanitizedDetails as any,
      },
    });

    // 2. Warm Storage: Tulis ke file JSONL lokal (Append-only & resilient)
    const logEntry = {
      timestamp,
      user_id: params.userId || null,
      action: params.action,
      method: params.method || "EVENT",
      path: params.path || "system",
      status_code: params.statusCode || 200,
      ip: params.ip || "127.0.0.1",
      user_agent: params.userAgent || "internal",
      details: sanitizedDetails,
    };

    const stream = getAuditStream();
    stream.write(JSON.stringify(logEntry) + "\n");

    await dbPromise;
  } catch (err: any) {
    console.warn("Failed to record audit event:", err.message);
  }
};

/**
 * Audit Logging Middleware:
 * Mencatat mutasi HTTP (POST, PUT, PATCH, DELETE) secara otomatis.
 */
export const auditLogger = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Lewati GET request biasa dan health check agar log tetap fokus pada mutasi
    if (req.method === "GET" || req.path.includes("/health")) {
      return next();
    }

    const startTime = Date.now();
    const originalSend = res.send.bind(res);

    res.send = (body: any) => {
      const userId = (req as any).user?.id || null;
      const ip =
        (req.headers["cf-connecting-ip"] as string) ||
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.ip ||
        req.socket.remoteAddress ||
        "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      const path = req.originalUrl || req.url;
      const method = req.method;
      const statusCode = res.statusCode;
      const latencyMs = Date.now() - startTime;

      const action = `${method} ${req.baseUrl || ""}${req.path}`;
      const sanitizedBody = sanitizeData(req.body);

      const details = {
        latencyMs,
        body: sanitizedBody && Object.keys(sanitizedBody).length > 0 ? sanitizedBody : undefined,
      };

      // Tulis secara non-blocking
      recordAuditEvent({
        userId,
        action,
        method,
        path,
        statusCode,
        ip,
        userAgent,
        details,
      }).catch(() => {});

      return originalSend(body);
    };

    next();
  };
};
