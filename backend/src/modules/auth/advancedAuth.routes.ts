import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { OAuth2Client } from "google-auth-library";
import prisma from "../../config/prisma.js";
import redis from "../../config/redis.js";
import { AuthModel } from "./auth.model.js";
import { verifyAccessToken } from "../../middleware/authMiddleware.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verify2FATempToken,
} from "../../utils/token.js";
import { hashPassword } from "../../utils/password.js";
import { encryptSecret, decryptSecret } from "../../utils/cryptoVault.js";
import { recordAuditEvent } from "../../middleware/auditLogMiddleware.js";
import { sendEmailOtp } from "../../services/emailService.js";
import { AppError } from "../../utils/appError.js";
import env from "../../config/env.js";

const router = Router();
const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

/**
 * 1. Setup 2FA: Menghasilkan Secret TOTP dan QR Code untuk Google Authenticator
 */
router.post("/2fa/setup", verifyAccessToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const email = user.email;
    const secret = generateSecret();
    const otpAuthUrl = generateURI({
      issuer: "Streetwear Store",
      label: email,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    // Simpan secret terenkripsi (AES-256-GCM) di database via Prisma (Encryption at Rest)
    await prisma.users.update({
      where: { id: userId },
      data: { two_factor_secret: encryptSecret(secret) },
    });

    return res.status(200).json({
      status: "success",
      message: "Scan this QR code with Google Authenticator or enter the manual key.",
      payload: {
        manualKey: secret,
        qrCode: qrCodeDataUrl,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 2. Verify & Enable 2FA: Memvalidasi token OTP pertama kali untuk mengaktifkan 2FA
 */
router.post("/2fa/verify", verifyAccessToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { token } = req.body;

    if (!token) {
      throw new AppError("2FA token is required", 400);
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { two_factor_secret: true },
    });

    const secret = decryptSecret(user?.two_factor_secret);

    if (!secret) {
      throw new AppError("Please run /2fa/setup first", 400);
    }

    const result = verifySync({ token: String(token), secret });
    if (!result.valid) {
      throw new AppError("Invalid 2FA code. Please try again.", 400);
    }

    await prisma.users.update({
      where: { id: userId },
      data: { is_two_factor_enabled: true },
    });

    return res.status(200).json({
      status: "success",
      message: "Two-factor authentication (2FA) has been successfully activated on your account.",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 3. Disable 2FA
 */
router.post("/2fa/disable", verifyAccessToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { token } = req.body;

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { two_factor_secret: true, is_two_factor_enabled: true },
    });

    if (!user || !user.is_two_factor_enabled || !user.two_factor_secret) {
      throw new AppError("2FA is not enabled on this account", 400);
    }

    const decryptedSecret = decryptSecret(user.two_factor_secret);
    if (!decryptedSecret) {
      throw new AppError("Invalid 2FA secret", 400);
    }

    const result = verifySync({ token: String(token), secret: decryptedSecret });
    if (!result.valid) {
      throw new AppError("Invalid 2FA code", 400);
    }

    await prisma.users.update({
      where: { id: userId },
      data: {
        is_two_factor_enabled: false,
        two_factor_secret: null,
      },
    });

    return res.status(200).json({
      status: "success",
      message: "2FA has been disabled.",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 4. Verify 2FA Login Challenge:
 * Menyelesaikan proses login bagi akun dengan 2FA aktif menggunakan tempToken dan kode 6-digit OTP.
 */
router.post("/2fa/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tempToken, token } = req.body;

    if (!tempToken || !token) {
      throw new AppError("Temporary token and 2FA OTP code are required", 400);
    }

    // 1. Verifikasi temporary token (durasi 5 menit)
    const payload = verify2FATempToken(tempToken);
    if (!payload || !payload.id) {
      throw new AppError("Invalid or expired 2FA session. Please log in again.", 401);
    }

    const userId = payload.id;

    // 2. Ambil user & secret dari database
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        two_factor_secret: true,
        is_two_factor_enabled: true,
      },
    });

    if (!user || !user.is_two_factor_enabled || !user.two_factor_secret) {
      throw new AppError("2FA is not enabled on this account", 400);
    }

    // 3. Dekripsi secret & verifikasi OTP via otplib (Time-based One-Time Password)
    const decryptedSecret = decryptSecret(user.two_factor_secret);
    if (!decryptedSecret) {
      throw new AppError("Invalid 2FA secret configuration", 400);
    }

    const result = verifySync({ token: String(token).trim(), secret: decryptedSecret });
    if (!result.valid) {
      throw new AppError("Invalid 2FA code. Please check your authenticator app.", 400);
    }

    // 4. Anti-Replay Protection via Redis: Cegah penggunaan kode yang sama 2x dalam window 30s
    const replayKey = `2fa_used:${userId}:${token}`;
    const wasAlreadyUsed = await redis.set(replayKey, "1", "EX", 60, "NX");
    if (!wasAlreadyUsed) {
      throw new AppError("This 2FA code has already been used. Please wait for the next code.", 400);
    }

    // 5. Terbitkan Full Access Token & Refresh Token
    const accessToken = generateAccessToken({ id: user.id, role: user.role || "user" });
    const refreshToken = generateRefreshToken({ id: user.id, role: user.role || "user" });

    // Simpan refresh token di Redis & PostgreSQL
    await AuthModel.saveRefreshToken(user.id, refreshToken);

    // 6. Rekam jejak di Audit Log
    const clientIp =
      (req.headers["cf-connecting-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";

    await recordAuditEvent({
      userId: user.id,
      action: "AUTH_2FA_LOGIN_SUCCESS",
      method: "POST",
      path: "/api/auth/2fa/login",
      statusCode: 200,
      ip: clientIp,
      userAgent: req.headers["user-agent"],
      details: { email: user.email },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      status: "success",
      message: "2FA authentication successful",
      payload: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 5. Request Email OTP (Kirim Kode 2FA 6-Digit ke Email):
 * Alternatif login 2FA jika pengguna sedang tidak memegang aplikasi Google Authenticator.
 */
router.post("/2fa/email/request", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tempToken } = req.body;
    if (!tempToken) {
      throw new AppError("Temporary 2FA token is required", 400);
    }

    const payload = verify2FATempToken(tempToken);
    if (!payload || !payload.id) {
      throw new AppError("Invalid or expired 2FA session. Please log in again.", 401);
    }

    const userId = payload.id;

    // Rate limiting cooldown 60 detik agar tidak spam request email
    const cooldownKey = `email_otp_cooldown:${userId}`;
    const isCoolingDown = await redis.get(cooldownKey);
    if (isCoolingDown) {
      throw new AppError("Mohon tunggu 60 detik sebelum meminta kode baru ke email.", 429);
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Generate kode acak 6-digit numerik
    const otpCode = crypto.randomInt(100000, 999999).toString();

    // Simpan di Redis dengan masa berlaku 5 menit (300 detik)
    const otpKey = `email_otp:${userId}`;
    await redis.set(otpKey, otpCode, "EX", 300);
    await redis.set(cooldownKey, "1", "EX", 60);

    // Kirim via Email Service
    await sendEmailOtp({
      to: user.email,
      name: user.name,
      code: otpCode,
    });

    // Catat ke Audit Log
    const clientIp =
      (req.headers["cf-connecting-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";

    await recordAuditEvent({
      userId: user.id,
      action: "AUTH_2FA_EMAIL_OTP_REQUESTED",
      method: "POST",
      path: "/api/auth/2fa/email/request",
      statusCode: 200,
      ip: clientIp,
      userAgent: req.headers["user-agent"],
      details: { email: user.email },
    });

    return res.status(200).json({
      status: "success",
      message: `Kode verifikasi 6-digit telah dikirimkan ke email ${user.email}. Kode berlaku 5 menit.`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 6. Verify Email OTP (Menuntaskan Login 2FA via Kode Email):
 */
router.post("/2fa/email/verify", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      throw new AppError("Temporary token and email OTP code are required", 400);
    }

    const payload = verify2FATempToken(tempToken);
    if (!payload || !payload.id) {
      throw new AppError("Invalid or expired 2FA session. Please log in again.", 401);
    }

    const userId = payload.id;
    const otpKey = `email_otp:${userId}`;
    const storedOtp = await redis.get(otpKey);

    if (!storedOtp) {
      throw new AppError("Kode verifikasi email telah kedaluwarsa atau belum diminta. Silakan minta kode baru.", 400);
    }

    if (storedOtp !== String(code).trim()) {
      throw new AppError("Kode verifikasi email salah. Silakan periksa kembali.", 400);
    }

    // Hapus OTP dari Redis setelah sukses (Anti-Replay)
    await redis.del(otpKey);

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const accessToken = generateAccessToken({ id: user.id, role: user.role || "user" });
    const refreshToken = generateRefreshToken({ id: user.id, role: user.role || "user" });

    await AuthModel.saveRefreshToken(user.id, refreshToken);

    const clientIp =
      (req.headers["cf-connecting-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";

    await recordAuditEvent({
      userId: user.id,
      action: "AUTH_2FA_EMAIL_LOGIN_SUCCESS",
      method: "POST",
      path: "/api/auth/2fa/email/verify",
      statusCode: 200,
      ip: clientIp,
      userAgent: req.headers["user-agent"],
      details: { email: user.email },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      status: "success",
      message: "2FA Email authentication successful",
      payload: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 4. Google OAuth2 Single Sign-On (SSO):
 * Menerima Google ID Token dari Google Sign-In SDK di frontend, memverifikasi ke Google,
 * dan otomatis mendaftarkan / meloginkan user ke sistem Streetwear.
 */
router.post("/google", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idToken, accessToken: googleAccessToken } = req.body;
    if (!idToken && !googleAccessToken) {
      throw new AppError("Google token is required", 400);
    }

    let email: string = "";
    let googleId: string = "";
    let name: string = "Google User";

    if (idToken) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (payload && payload.email) {
          if (!payload.email_verified) {
            throw new AppError("Google account email is not verified", 403);
          }
          email = payload.email.toLowerCase();
          googleId = payload.sub;
          name = payload.name || "Google User";
        }
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        // Fallback jika token yang dikirim adalah OAuth2 access_token
      }
    }

    // Jika yang dikirim oleh useGoogleLogin adalah OAuth2 Access Token
    if (!email && (googleAccessToken || idToken)) {
      const tokenToFetch = googleAccessToken || idToken;
      try {
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenToFetch}` },
        });
        if (userInfoRes.ok) {
          const info = (await userInfoRes.json()) as any;
          if (info.email_verified === false) {
            throw new AppError("Google account email is not verified", 403);
          }
          email = info.email?.toLowerCase();
          googleId = info.sub;
          name = info.name || "Google User";
        }
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        console.warn("Failed to fetch Google userinfo:", err.message);
      }
    }

    if (!email) {
      throw new AppError("Could not retrieve profile from Google", 400);
    }

    // Cari user berdasarkan google_id atau email via Prisma
    let user = await prisma.users.findFirst({
      where: {
        OR: [{ google_id: googleId }, { email: email }],
      },
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      // Generate cryptographically secure random hashed password (cegah password tebakan / plaintext)
      const randomSecret = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await hashPassword(randomSecret);

      try {
        // User baru: Daftarkan otomatis via Prisma
        user = await prisma.users.create({
          data: {
            name,
            email,
            password: hashedPassword,
            google_id: googleId,
            role: "user",
          },
        });
      } catch (err: any) {
        // Penanganan race condition P2002 jika request paralel terjadi bersamaan
        if (err.code === "P2002") {
          user = await prisma.users.findFirst({
            where: { OR: [{ google_id: googleId }, { email: email }] },
          });
          if (!user) throw err;
        } else {
          throw err;
        }
      }
    } else if (!user.google_id) {
      // Tautkan akun lama yang emailnya sama dengan google_id
      user = await prisma.users.update({
        where: { id: user.id },
        data: { google_id: googleId },
      });
    }

    const accessToken = generateAccessToken({ id: user.id, role: user.role || "user" });
    const refreshToken = generateRefreshToken({ id: user.id, role: user.role || "user" });

    // Rekam jejak digital di Audit Log
    const clientIp =
      (req.headers["cf-connecting-ip"] as string) ||
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";

    await recordAuditEvent({
      userId: user.id,
      action: isNewUser ? "AUTH_GOOGLE_REGISTER" : "AUTH_GOOGLE_LOGIN",
      method: "POST",
      path: "/api/auth/google",
      statusCode: 200,
      ip: clientIp,
      userAgent: req.headers["user-agent"],
      details: {
        email: user.email,
        google_id: googleId,
        is_new_user: isNewUser,
      },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      status: "success",
      message: "Successfully authenticated with Google",
      payload: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
