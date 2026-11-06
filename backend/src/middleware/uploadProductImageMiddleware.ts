import { Request, Response, NextFunction } from "express";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";

const uploadDir = path.join(
  process.cwd(),
  "public/img/products"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeType = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  if (allowedMimeType.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only JPEG, PNG, or WebP image files are allowed!"
      )
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

export const uploadProductImage = (req: Request, res: Response, next: NextFunction) => {
  upload.single("img_url")(req, res, async (err: any) => {
    if (err instanceof multer.MulterError) {
      return res
        .status(400)
        .json({ errors: `Multer error, ${err.message}` });
    } else if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) return next();

    try {
      const filename = `product-${Date.now()}.webp`;
      const outputPath = path.join(uploadDir, filename);

      await sharp(req.file.buffer)
        .resize(1000, 1000, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toFile(outputPath);

      (req.file as any).savedPath = `/uploads/products/${filename}`;

      next();
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Gagal memproses gambar." });
    }
  });
};
