import jwt from "jsonwebtoken";
import env from "../config/env.js";

export interface UserPayload {
  id: number;
  role: string;
  [key: string]: any;
}

export const generateAccessToken = (user: UserPayload): string => {
  return jwt.sign(
    { id: user.id, role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: "15m", algorithm: "HS256" }
  );
};

export const generateRefreshToken = (user: UserPayload): string => {
  return jwt.sign(
    { id: user.id, role: user.role },
    env.JWT_REFRESH_SECRET,
    { expiresIn: "7d", algorithm: "HS256" }
  );
};

export const verifyRefreshToken = (token: string): any => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: ["HS256"],
    });
  } catch (error) {
    return null;
  }
};

/**
 * Temporary Token berdurasi 5 menit untuk tantangan login 2FA (Two-Factor Challenge)
 */
export const generate2FATempToken = (userId: number): string => {
  return jwt.sign(
    { id: userId, is2FAChallenge: true },
    env.JWT_ACCESS_SECRET,
    { expiresIn: "5m", algorithm: "HS256" }
  );
};

export const verify2FATempToken = (
  token: string
): { id: number; is2FAChallenge: boolean } | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ["HS256"],
    }) as any;
    if (decoded && decoded.is2FAChallenge) {
      return decoded;
    }
    return null;
  } catch {
    return null;
  }
};
