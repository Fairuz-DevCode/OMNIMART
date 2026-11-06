import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError.js";

export const handleJsonSyntaxError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && (err as any).status === 400 && "body" in err) {
    return next(new AppError("Malformed JSON in request body", 400));
  }
  next(err);
};
