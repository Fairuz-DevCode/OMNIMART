import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const CSRF_COOKIE_NAME = "_csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Double Submit Cookie CSRF Protection.
 * Mencegah serangan Cross-Site Request Forgery pada browser SPA/Client.
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // 1. Jika belum ada cookie CSRF, buatkan token baru dan set ke client
  let token = req.cookies[CSRF_COOKIE_NAME];
  if (!token) {
    token = crypto.randomBytes(32).toString("hex");
    res.cookie(CSRF_COOKIE_NAME, token, {
      httpOnly: false, // Dibuat false agar JavaScript frontend bisa membaca dan mengirimnya di header x-csrf-token
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
  }

  // 2. Request GET, HEAD, OPTIONS adalah request idempotent/read-only (aman dari CSRF)
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // 3. Endpoint otentikasi awal (login, register, google SSO, refresh token) dikecualikan
  // karena user belum memiliki sesi/auth state yang bisa dipalsukan (CSRF hanya menargetkan akun yang sedang login)
  const isAuthRoute =
    req.path.includes("/auth/login") ||
    req.path.includes("/auth/register") ||
    req.path.includes("/auth/refresh") ||
    req.path.includes("/auth/google");

  if (isAuthRoute) {
    return next();
  }

  // 3. Untuk request mutasi (POST, PUT, PATCH, DELETE) yang memakai cookie session,
  // validasi apakah token di header cocok dengan token di cookie
  const headerToken = (req.headers[CSRF_HEADER_NAME] || req.headers["csrf-token"]) as string | undefined;

  // Jika request menggunakan Authorization: Bearer <token> murni (misal mobile app atau server-to-server), bypass CSRF
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    return next();
  }

  // Jika request berbasis web cookie browser, wajib ada CSRF token yang cocok
  if (!headerToken || headerToken !== token) {
    return res.status(403).json({
      status: "error",
      message: "CSRF token validation failed. Invalid or missing CSRF token.",
    });
  }

  next();
};
