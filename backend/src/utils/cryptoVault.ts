import crypto from "crypto";
import env from "../config/env.js";

// Turunkan kunci simetris 256-bit (32 byte) dari JWT_ACCESS_SECRET menggunakan SHA-256
const MASTER_KEY = crypto.createHash("sha256").update(env.JWT_ACCESS_SECRET).digest();
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits standar untuk Galois/Counter Mode (GCM)
const PREFIX = "enc:v1:";

/**
 * Mengenkripsi string rahasia menggunakan standar industri AES-256-GCM.
 * Menghasilkan IV acak unik pada setiap enkripsi untuk mencegah serangan replay & pola data.
 * Format Output: enc:v1:<iv_hex>:<auth_tag_hex>:<ciphertext_hex>
 */
export const encryptSecret = (plaintext: string): string => {
  if (!plaintext) return plaintext;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);

  let ciphertext = cipher.update(plaintext, "utf8", "hex");
  ciphertext += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${PREFIX}${iv.toString("hex")}:${authTag}:${ciphertext}`;
};

/**
 * Mendekripsi string rahasia terenkripsi AES-256-GCM.
 * Memverifikasi keaslian data (Integrity Tag) untuk memastikan ciphertext tidak pernah dimanipulasi.
 * Backward-Compatible: Jika nilai belum terenkripsi (data lama), fungsi mengembalikan teks aslinya.
 */
export const decryptSecret = (encryptedValue: string | null | undefined): string | null => {
  if (!encryptedValue) return null;

  // Jika data lama belum terenkripsi, kembalikan langsung (migrasi aman)
  if (!encryptedValue.startsWith(PREFIX)) {
    return encryptedValue;
  }

  try {
    const rawData = encryptedValue.slice(PREFIX.length);
    const parts = rawData.split(":");
    if (parts.length !== 3) {
      throw new Error("Format ciphertext tidak valid");
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err: any) {
    console.error("Gagal melakukan dekripsi rahasia:", err.message);
    throw new Error("Gagal mendekripsi data: kunci tidak cocok atau data telah dimanipulasi");
  }
};
