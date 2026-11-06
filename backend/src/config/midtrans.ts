// @ts-ignore
import midtransClient from "midtrans-client";

// Create Snap API instance
export const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-placeholder",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "SB-Mid-client-placeholder",
});

// Create Core API instance if needed for status check / cancellation
export const coreApi = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-placeholder",
  clientKey: process.env.MIDTRANS_CLIENT_KEY || "SB-Mid-client-placeholder",
});
