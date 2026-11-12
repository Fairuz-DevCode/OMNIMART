// @ts-ignore
import midtransClient from "midtrans-client";
import env from "./env.js";

// Create Snap API instance
export const snap = new midtransClient.Snap({
  isProduction: env.MIDTRANS_IS_PRODUCTION ?? false,
  serverKey: env.MIDTRANS_SERVER_KEY || "",
  clientKey: env.MIDTRANS_CLIENT_KEY || "",
});

// Create Core API instance if needed for status check / cancellation
export const coreApi = new midtransClient.CoreApi({
  isProduction: env.MIDTRANS_IS_PRODUCTION ?? false,
  serverKey: env.MIDTRANS_SERVER_KEY || "",
  clientKey: env.MIDTRANS_CLIENT_KEY || "",
});
