import { Request, Response, NextFunction, CookieOptions } from "express";
import { AuthService } from "./auth.service.js";
import { AppError } from "../../utils/appError.js";
import env from "../../config/env.js";

const cookiesOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { user, accessToken, refreshToken } = await AuthService.registerUser(req.body);

      res.cookie("refreshToken", refreshToken, cookiesOptions);

      return res.status(201).json({
        status: "success",
        message: "Registration Succes",
        payload: {
          user,
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.loginUser({
        email: req.body.email,
        password: req.body.password,
      });

      if (result.mfaRequired) {
        return res.status(200).json({
          status: "2fa_required",
          message: "Two-factor authentication code required",
          payload: {
            mfaRequired: true,
            tempToken: result.tempToken,
            user: result.user,
          },
        });
      }

      res.cookie("refreshToken", result.refreshToken, cookiesOptions);

      return res.status(200).json({
        status: "success",
        message: "Login successful",
        payload: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        throw new AppError(
          "Refresh token missing or invalid",
          401,
          "Invalid or expired refresh token"
        );
      }

      const { accessToken, newRefreshToken } = await AuthService.refreshTokenServices(refreshToken);

      // Refresh Token Rotation: Set cookie baru untuk refreshToken yang baru dirotasi
      res.cookie("refreshToken", newRefreshToken, cookiesOptions);

      return res.json({
        status: "success",
        message: "Access token refreshed successfully",
        payload: {
          accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken;

      if (!refreshToken) {
        throw new AppError(
          "Unauthorized access",
          401,
          "User not authenticated or session already expired"
        );
      }

      await AuthService.logoutUser(refreshToken);

      res.clearCookie("refreshToken", cookiesOptions);

      return res.status(200).json({
        status: "success",
        message: "Logout successful",
      });
    } catch (error) {
      next(error);
    }
  }
}
