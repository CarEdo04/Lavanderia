import nodemailer from "nodemailer";

export function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

// Sends a plain-text email through the SMTP server configured in .env.
// Without SMTP_HOST (local development) the email is printed to the server
// console instead, so links can still be followed.
export async function sendMail(to: string, subject: string, text: string) {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log(`\n[email non inviata: SMTP non configurato]\nA: ${to}\nOggetto: ${subject}\n\n${text}\n`);
    return;
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  await transport.sendMail({ from: process.env.MAIL_FROM ?? process.env.SMTP_USER, to, subject, text });
}
