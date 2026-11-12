import { AuthModel } from "./auth.model.js";
import { UserRegisterDTO, UserLoginDTO, AuthTokens, LoginResult } from "./auth.types.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generate2FATempToken,
} from "../../utils/token.js";
import { hashPassword, comparePassword } from "../../utils/password.js";
import { AppError } from "../../utils/appError.js";

export class AuthService {
  static async registerUser({ name, email, password }: UserRegisterDTO): Promise<AuthTokens> {
    const userExists = await AuthModel.findByEmail(email);
    if (userExists) {
      throw new AppError("Email already registered", 409);
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await AuthModel.createUser({
      name,
      email,
      password: hashedPassword,
    });

    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);

    await AuthModel.saveRefreshToken(newUser.id, refreshToken);

    const user = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    };

    return { user, accessToken, refreshToken };
  }

  static async loginUser({ email, password }: UserLoginDTO): Promise<LoginResult> {
    const userData = await AuthModel.findByEmail(email);
    if (!userData) {
      throw new AppError("Invalid email or password", 401);
    }

    const isMatch = await comparePassword(password, userData.password);
    if (!isMatch) {
      throw new AppError("Invalid email or password", 401);
    }

    // Jika 2FA aktif, jangan terbitkan token penuh - minta kode OTP
    if (userData.is_two_factor_enabled) {
      const tempToken = generate2FATempToken(userData.id);
      return {
        mfaRequired: true,
        tempToken,
        user: {
          id: userData.id,
          email: userData.email,
        },
      };
    }

    const refreshToken = generateRefreshToken(userData);
    await AuthModel.saveRefreshToken(userData.id, refreshToken);

    const accessToken = generateAccessToken(userData);

    const user = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
    };

    return { mfaRequired: false, user, accessToken, refreshToken };
  }

  static async refreshTokenServices(
    refreshToken: string
  ): Promise<{ accessToken: string; newRefreshToken: string }> {
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    const tokenInDb = await AuthModel.findRefreshToken(decoded.id, refreshToken);

    if (!tokenInDb) {
      // Cek apakah token masih berada dalam grace period 15 detik (request konkuren)
      const isGrace = await AuthModel.checkGracePeriod(decoded.id, refreshToken);
      if (isGrace) {
        const currentToken = await AuthModel.getCurrentToken(decoded.id);
        const newAccessToken = generateAccessToken({
          id: decoded.id,
          role: decoded.role,
        });
        return {
          accessToken: newAccessToken,
          newRefreshToken: currentToken || refreshToken,
        };
      }

      // Deteksi REUSE ATTEMPT! Token curian yang sudah pernah dirotasi dicoba dipakai lagi
      console.warn(
        `🚨 SECURITY ALERT: Refresh token reuse attempt detected for user ID ${decoded.id}! Revoking all sessions.`
      );
      await AuthModel.revokeAllUserTokens(decoded.id);
      throw new AppError("Security alert: Token reuse detected. All sessions terminated.", 401);
    }

    // 1. Generate Access Token baru (15m)
    const newAccessToken = generateAccessToken({
      id: decoded.id,
      role: decoded.role,
    });

    // 2. Refresh Token Rotation (RTR): Terbitkan Refresh Token BARU (7d)
    const newRefreshToken = generateRefreshToken({
      id: decoded.id,
      role: decoded.role,
    });

    // 3. Rotasikan token di Redis & PostgreSQL (dengan 15 detik grace period)
    await AuthModel.rotateRefreshToken(decoded.id, refreshToken, newRefreshToken);

    return { accessToken: newAccessToken, newRefreshToken };
  }

  static async logoutUser(refreshToken: string): Promise<void> {
    if (refreshToken) {
      await AuthModel.deleteRefreshToken(refreshToken);
    }
  }
}
