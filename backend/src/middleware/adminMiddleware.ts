import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma.js";

/**
 * Role-Based Access Control (RBAC):
 * Membatasi akses endpoint untuk beberapa role tertentu (misal: 'admin', 'superadmin', 'manager').
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        status: "error",
        message: `Forbidden: Access restricted to [${allowedRoles.join(", ")}] roles only.`,
      });
    }

    next();
  };
};

/**
 * Attribute-Based Access Control (ABAC / Data Ownership Protection):
 * Memastikan bahwa user hanya bisa mengakses / mengubah data miliknya sendiri.
 * Admin tetap diizinkan untuk melewati pengecekan kepemilikan.
 * 
 * @param tableName Nama tabel database (misal 'addresses', 'orders')
 * @param idParam Nama parameter di URL req.params (default: 'id')
 * @param ownerColumn Kolom penyimpan id pemilik (default: 'user_id')
 */
export const checkOwnership = (
  tableName: string,
  idParam: string = "id",
  ownerColumn: string = "user_id"
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Role admin bebas mengakses data apapun
    if (user.role === "admin") {
      return next();
    }

    const resourceId = req.params[idParam];
    if (!resourceId) {
      return next();
    }

    try {
      const record = await (prisma as any)[tableName]?.findUnique({
        where: { id: Number(resourceId) },
        select: { [ownerColumn]: true },
      });

      if (!record) {
        return res.status(404).json({ message: "Resource not found" });
      }

      const resourceOwnerId = record[ownerColumn];
      if (resourceOwnerId !== user.id) {
        return res.status(403).json({
          status: "error",
          message: "Forbidden: You do not have permission to access or modify this resource.",
        });
      }

      next();
    } catch (err: any) {
      next(err);
    }
  };
};

// Backward-compatible alias untuk verifyAdmin yang lama
export const verifyAdmin = authorizeRoles("admin");
