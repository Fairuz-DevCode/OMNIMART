import { Router, Request, Response, NextFunction } from "express";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import { OAuth2Client } from "google-auth-library";
import prisma from "../../config/prisma.js";
import { verifyAccessToken } from "../../middleware/authMiddleware.js";
import { generateAccessToken, generateRefreshToken } from "../../utils/token.js";
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

    // Simpan secret sementara di database via Prisma
    await prisma.users.update({
      where: { id: userId },
      data: { two_factor_secret: secret },
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

    const secret = user?.two_factor_secret;

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

    const result = verifySync({ token: String(token), secret: user.two_factor_secret });
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
          email = payload.email.toLowerCase();
          googleId = payload.sub;
          name = payload.name || "Google User";
        }
      } catch {
        // Fallback jika bukan idToken murni
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
          email = info.email?.toLowerCase();
          googleId = info.sub;
          name = info.name || "Google User";
        }
      } catch (err: any) {
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

    if (!user) {
      // User baru: Daftarkan otomatis via Prisma
      user = await prisma.users.create({
        data: {
          name,
          email,
          password: `google_auth_${Date.now()}`,
          google_id: googleId,
          role: "user",
        },
      });
    } else if (!user.google_id) {
      // Tautkan akun lama yang emailnya sama dengan google_id
      user = await prisma.users.update({
        where: { id: user.id },
        data: { google_id: googleId },
      });
    }

    const accessToken = generateAccessToken({ id: user.id, role: user.role || "user" });
    const refreshToken = generateRefreshToken({ id: user.id, role: user.role || "user" });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
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
