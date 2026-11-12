import { Request, Response, NextFunction } from "express";
import env from "../config/env.js";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (
    err instanceof SyntaxError &&
    (err as any).status === 400 &&
    "body" in err
  ) {
    return res.status(400).json({
      status: "fail",
      message: "Malformed JSON in request body",
      errors: null,
    });
  }

  const statusCode = err.statusCode || 500;
  const status = err.status || "error";

  // Security Hardening: Di production, sembunyikan pesan error internal (500) agar tidak bocor detail database / query
  const isProduction = env.NODE_ENV === "production";
  const isInternalServerError = statusCode >= 500;

  if (isInternalServerError) {
    console.error("❌ [UNHANDLED INTERNAL ERROR]:", err);
  }

  const message =
    isProduction && isInternalServerError
      ? "Internal Server Error"
      : err.message || "Internal Server Error";

  const errors = isProduction && isInternalServerError ? null : err.errors || null;

  return res.status(statusCode).json({
    status: status,
    message: message,
    errors: errors,
  });
};
