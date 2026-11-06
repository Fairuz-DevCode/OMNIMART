import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const formatedErrors = result.error.issues.map(
      (issue) => {
        return {
          field: issue.path[0],
          message: issue.message,
        };
      }
    );

    return res.status(422).json({
      status: "fail",
      message: "Validation failed",
      errors: formatedErrors,
    });
  }

  req.body = result.data;

  next();
};
