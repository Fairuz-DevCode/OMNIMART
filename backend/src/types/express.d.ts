import { UserPayload } from "../utils/token.js";

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      file?: Multer.File & {
        savedPath?: string;
      };
    }
  }
}
