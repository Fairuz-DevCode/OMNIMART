import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma.js";

/**
 * Audit Logging Middleware:
 * Mencatat jejak digital "siapa, aksi apa, kapan, status code, dan dari IP mana"
 * untuk investigasi keamanan & compliance pasca-insiden.
 */
export const auditLogger = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Lewati GET request biasa dan health check agar database audit log tidak membengkak
    if (req.method === "GET" || req.path.includes("/health")) {
      return next();
    }

    const startTime = Date.now();
    const originalSend = res.send.bind(res);

    res.send = (body: any) => {
      // Ambil metadata request
      const userId = (req as any).user?.id || null;
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const userAgent = req.headers["user-agent"] || "unknown";
      const path = req.originalUrl || req.url;
      const method = req.method;
      const statusCode = res.statusCode;
      const latencyMs = Date.now() - startTime;

      // Buat ringkasan aksi
      const action = `${method} ${req.baseUrl || ""}${req.path}`;

      // Jangan log data sensitif seperti password
      const sanitizedBody = { ...req.body };
      if (sanitizedBody.password) sanitizedBody.password = "[REDACTED]";
      if (sanitizedBody.token) sanitizedBody.token = "[REDACTED]";

      const details = {
        latencyMs,
        body: Object.keys(sanitizedBody).length > 0 ? sanitizedBody : undefined,
      };

      // Simpan log secara asinkron tanpa memperlambat client response via Prisma
      prisma.audit_logs
        .create({
          data: {
            user_id: userId ? Number(userId) : null,
            action: action.slice(0, 100),
            method: method.slice(0, 10),
            path: path.slice(0, 255),
            status_code: statusCode,
            ip_address: String(ip).slice(0, 50),
            user_agent: userAgent,
            details: details as any,
          },
        })
        .catch((err) => {
          console.warn("Failed to write audit log:", err.message);
        });

      return originalSend(body);
    };

    next();
  };
};
