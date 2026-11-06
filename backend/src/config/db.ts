import dotenv from "dotenv";
dotenv.config();

import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD ?? ""),
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
