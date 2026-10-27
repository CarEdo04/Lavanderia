import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./db";
import { appUrl, sendMail } from "./mail";
import { secretKey } from "./session";

const VALID_FOR = "48h";

// The token carries the email it was sent to, so it stops working if the
// address changes.
export async function sendVerificationEmail(user: { id: number; email: string; firstName: string }) {
  const token = await new SignJWT({ uid: user.id, email: user.email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(VALID_FOR)
    .sign(secretKey("verify-email"));
  const link = `${appUrl()}/verifica?token=${encodeURIComponent(token)}`;

  await prisma.user.update({ where: { id: user.id }, data: { verificationSentAt: new Date() } });
  await sendMail(
    user.email,
    "Conferma il tuo indirizzo email · Lavanderia",
    `Ciao ${user.firstName},\n\n` +
      `per attivare il tuo account e prenotare la lavanderia, conferma il tuo indirizzo email aprendo questo link:\n\n` +
      `${link}\n\n` +
      `Il link è valido per 48 ore. Se non hai creato tu l'account, ignora questa email.\n`,
  );
}

// Returns the verified user id, or null if the token is invalid or expired.
export async function verifyEmailToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey("verify-email"));
    const user = await prisma.user.findUnique({ where: { id: Number(payload.uid) } });
    if (!user || user.email !== payload.email) return null;
    if (!user.emailVerifiedAt) {
      await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    }
    return user.id;
  } catch {
    return null;
  }
}
