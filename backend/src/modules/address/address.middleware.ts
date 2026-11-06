import { Request, Response, NextFunction } from "express";
import { AddressModel } from "./address.model.js";
// @ts-ignore
import stringSimilarity from "string-similarity";

export const checkDuplicateAddress = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next();

    const { postal_code, street_address } = req.body;

    if (!postal_code || !street_address) {
      return next();
    }

    const existingAddresses = await AddressModel.getAddressesByUserId(userId);

    const cleanText = (text: string) =>
      text
        .toLowerCase()
        .replace(/[.,\/#$%\^&\*;:{}=\-_`~()]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const newPostal = String(postal_code).trim();
    const newStreet = cleanText(street_address);

    for (const existing of existingAddresses) {
      const existingPostal = String(existing.postal_code).trim();

      if (newPostal === existingPostal) {
        const existingStreet = cleanText(existing.street_address);

        const similarity =
          stringSimilarity.compareTwoStrings(newStreet, existingStreet) * 100;

        if (similarity > 80) {
          return res.status(400).json({
            status: "fail",
            message: "Validation failed",
            errors: [
              {
                field: "street_address",
                message: `The address is too similar to an existing record (${similarity.toFixed(1)}% similarity) under the same postal code`,
              },
            ],
          });
        }
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};
