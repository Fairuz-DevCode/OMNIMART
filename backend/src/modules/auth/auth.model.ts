import prisma from "../../config/prisma.js";
import redis from "../../config/redis.js";
import { UserInDB, UserRegisterDTO, UserResponse } from "./auth.types.js";

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 hari dalam detik

export class AuthModel {
  static async findByEmail(email: string): Promise<UserInDB | null> {
    const user = await prisma.users.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        role: true,
        is_two_factor_enabled: true,
      },
    });
    if (!user) return null;
    return {
      ...user,
      role: (user.role as string) || "user",
    };
  }

  static async createUser({ name, email, password }: UserRegisterDTO): Promise<UserResponse> {
    const user = await prisma.users.create({
      data: {
        name,
        email,
        password,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
    return {
      ...user,
      role: (user.role as string) || "user",
    };
  }

  static async saveRefreshToken(userId: number, token: string): Promise<any> {
    try {
      // 1. Simpan di Redis dengan TTL 7 hari
      await redis.set(`refresh_token:${userId}`, token, "EX", REFRESH_TOKEN_TTL);
    } catch (err) {
      console.warn("Redis saveRefreshToken error, fallback to PostgreSQL:", err);
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 2. Fallback simpan juga di DB PostgreSQL via Prisma
    await prisma.refresh_tokens.deleteMany({
      where: {
        OR: [
          { user_id: userId },
          { expires_at: { lt: new Date() } },
        ],
      },
    });

    return await prisma.refresh_tokens.create({
      data: {
        user_id: userId,
        token,
        expires_at: expiresAt,
      },
    });
  }

  static async findRefreshToken(userId: number, token: string): Promise<any> {
    try {
      // Cek Redis terlebih dahulu (<1ms)
      const cachedToken = await redis.get(`refresh_token:${userId}`);
      if (cachedToken) {
        if (cachedToken === token) {
          return { user_id: userId, token };
        }
        return null;
      }
    } catch (err) {
      console.warn("Redis findRefreshToken error, fallback to PostgreSQL:", err);
    }

    // Fallback baca dari PostgreSQL via Prisma jika key di Redis belum ada/miss
    return await prisma.refresh_tokens.findFirst({
      where: {
        user_id: userId,
        token,
      },
    });
  }

  static async getCurrentToken(userId: number): Promise<string | null> {
    try {
      const cachedToken = await redis.get(`refresh_token:${userId}`);
      if (cachedToken) return cachedToken;
    } catch (err) {
      console.warn("Redis getCurrentToken error:", err);
    }
    const row = await prisma.refresh_tokens.findFirst({
      where: { user_id: userId, expires_at: { gt: new Date() } },
      orderBy: { created_at: "desc" },
    });
    return row ? row.token : null;
  }

  static async rotateRefreshToken(userId: number, oldToken: string, newToken: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
      // Grace period 15 detik untuk menangani request konkuren dari frontend
      await redis.set(`previous_refresh_token:${userId}`, oldToken, "EX", 15);
      await redis.set(`refresh_token:${userId}`, newToken, "EX", REFRESH_TOKEN_TTL);
    } catch (err) {
      console.warn("Redis rotateRefreshToken error, fallback to PostgreSQL:", err);
    }

    await prisma.refresh_tokens.deleteMany({
      where: {
        OR: [
          { token: oldToken },
          { user_id: userId },
          { expires_at: { lt: new Date() } },
        ],
      },
    });

    await prisma.refresh_tokens.create({
      data: {
        user_id: userId,
        token: newToken,
        expires_at: expiresAt,
      },
    });
  }

  static async checkGracePeriod(userId: number, token: string): Promise<boolean> {
    try {
      const prevToken = await redis.get(`previous_refresh_token:${userId}`);
      return prevToken === token;
    } catch {
      return false;
    }
  }

  static async revokeAllUserTokens(userId: number): Promise<void> {
    try {
      await redis.del(`refresh_token:${userId}`);
      await redis.del(`previous_refresh_token:${userId}`);
    } catch (err) {
      console.warn("Redis revokeAllUserTokens error:", err);
    }

    await prisma.refresh_tokens.deleteMany({
      where: { user_id: userId },
    });
  }

  static async deleteRefreshToken(token: string): Promise<any> {
    try {
      // Hapus token di database PostgreSQL via Prisma & invalidate di Redis
      const existing = await prisma.refresh_tokens.findFirst({
        where: { token },
      });
      if (existing) {
        await prisma.refresh_tokens.delete({
          where: { id: existing.id },
        });
        await redis.del(`refresh_token:${existing.user_id}`);
        await redis.del(`previous_refresh_token:${existing.user_id}`);
        return existing;
      }
      return null;
    } catch {
      return null;
    }
  }
}
