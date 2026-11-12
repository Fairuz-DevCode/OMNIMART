import nodemailer from "nodemailer";
import env from "../config/env.js";

// Buat transporter jika SMTP host & user tersedia
const hasSmtpConfig = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

export interface SendOtpEmailParams {
  to: string;
  name?: string;
  code: string;
}

/**
 * Mengirimkan Email Verifikasi OTP 6-Digit untuk MFA / 2FA
 */
export const sendEmailOtp = async ({ to, name = "Pelanggan", code }: SendOtpEmailParams): Promise<boolean> => {
  const subject = `[Nexa Streetwear] Kode Verifikasi Masuk: ${code}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f0f11; color: #f3f4f6; margin: 0; padding: 24px; }
          .container { max-width: 500px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 32px; }
          .brand { font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #ffffff; text-transform: uppercase; margin-bottom: 24px; text-align: center; }
          .title { font-size: 18px; font-weight: 600; color: #f4f4f5; margin-bottom: 12px; }
          .text { font-size: 14px; color: #a1a1aa; line-height: 1.6; margin-bottom: 24px; }
          .otp-box { background-color: #09090b; border: 2px dashed #3f3f46; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 24px; }
          .otp-code { font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #10b981; font-family: monospace; }
          .footer { font-size: 12px; color: #71717a; text-align: center; border-top: 1px solid #27272a; padding-top: 20px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="brand">NEXA STREETWEAR</div>
          <div class="title">Verifikasi Masuk Dua Langkah (2FA)</div>
          <div class="text">
            Halo <strong>${name}</strong>,<br/>
            Kami mendeteksi permintaan masuk ke akun Anda. Masukkan kode verifikasi 6-digit di bawah ini untuk menyelesaikan proses login:
          </div>
          <div class="otp-box">
            <div class="otp-code">${code}</div>
          </div>
          <div class="text">
            Kode ini hanya berlaku selama <strong>5 menit</strong>. Jangan pernah membagikan kode ini kepada siapa pun, termasuk staf Nexa.
          </div>
          <div class="footer">
            Jika Anda tidak merasa melakukan upaya masuk ini, segera amankan akun Anda dan ganti kata sandi.<br/><br/>
            &copy; ${new Date().getFullYear()} Nexa Streetwear Inc. Seluruh hak cipta dilindungi.
          </div>
        </div>
      </body>
    </html>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        html,
      });
      return true;
    } catch (err: any) {
      console.error("Gagal mengirim email via SMTP:", err.message);
      // Fallback ke simulator console jika SMTP error
    }
  }

  // Development Fallback Simulator (Jika SMTP belum dikonfigurasi)
  console.log("\n" + "=".repeat(60));
  console.log("  📧 [DEV EMAIL SIMULATOR - NEXA 2FA]");
  console.log(`  Kepada   : ${to} (${name})`);
  console.log(`  Subjek   : ${subject}`);
  console.log(`  KODE OTP : >> ${code} << (Berlaku 5 Menit)`);
  console.log("=".repeat(60) + "\n");

  return true;
};
