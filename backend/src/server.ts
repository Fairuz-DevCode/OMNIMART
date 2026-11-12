import app from "./app.js";
import prisma from "./config/prisma.js";
import redis from "./config/redis.js";
import env from "./config/env.js";

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Anti-Slowloris & Connection Starvation Hardening (TCP/HTTP Socket Level)
// Nilai keepAliveTimeout diset 65s (lebih besar dari timeout standar 60s pada Nginx / AWS ALB)
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000; // Memutus koneksi jika pengiriman header sengaja diperlambat
server.requestTimeout = 30000; // Batas mutlak pembacaan request di level TCP socket

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down server gracefully...`);

  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("Database connection closed.");

      redis.disconnect();
      console.log("Redis connection closed.");

      process.exit(0);
    } catch (err) {
      console.error("Error during graceful shutdown:", err);
      process.exit(1);
    }
  });

  // Force shutdown jika tidak selesai dalam 10 detik
  setTimeout(() => {
    console.error("Forced shutdown due to timeout.");
    process.exit(1);
  }, 10000).unref();
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
