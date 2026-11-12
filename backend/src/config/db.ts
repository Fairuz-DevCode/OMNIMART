import env from "./env.js";
import pkg from "pg";
const { Pool } = pkg;

const isProduction = env.NODE_ENV === "production";
const isRemoteDb = env.DB_HOST !== "localhost" && env.DB_HOST !== "127.0.0.1";
const shouldUseSSL = env.DB_SSL ?? (isProduction && isRemoteDb);

const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  ssl: shouldUseSSL ? { rejectUnauthorized: false } : undefined,
  max: 20, // Batas maksimal koneksi pool untuk mencegah Database Connection Pool Exhaustion
  idleTimeoutMillis: 30000, // Tutup koneksi idle setelah 30 detik untuk mencegah leaked database connections
  connectionTimeoutMillis: 5000, // Gagal cepat dalam 5 detik jika pool habis (jangan menggantung)
});

pool.on("connect", () => {
  console.log("connected to the database");
});

pool.on("error", (err: Error) => {
  console.log("Database error", err);
});

export const withTransaction = async <T>(
  callback: (client: pkg.PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
