import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError.js";

/**
 * Middleware untuk membatasi durasi eksekusi request (Timeouts).
 * Mencegah request menggantung tanpa batas (hanging connection) jika ada query lambat atau downstream service timeout.
 * @param timeoutMs Durasi timeout dalam milidetik (default 15.000 ms / 15 detik)
 */
export const requestTimeout = (timeoutMs: number = 15000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        next(new AppError("Request timed out. Please try again later.", 504));
      }
    }, timeoutMs);

    // Bersihkan timer ketika response selesai terkirim atau ditutup
    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));

    next();
  };
};
