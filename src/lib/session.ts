import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./db";

const COOKIE = "sessione";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Other token types (e.g. email verification) get their own derived key, so
// they can never be accepted as a session cookie.
export function secretKey(purpose: "session" | "verify-email" = "session") {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET mancante o troppo corta (minimo 32 caratteri)");
  }
  return new TextEncoder().encode(purpose === "session" ? secret : `${secret}:${purpose}`);
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export type CurrentUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  room: string | null;
  role: string;
  emailVerifiedAt: Date | null;
};

// The role is read from the database on every request, so promotions and
// demotions take effect immediately.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  let uid: number;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    uid = Number(payload.uid);
  } catch {
    return null;
  }
  return prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, email: true, firstName: true, lastName: true, room: true, role: true, emailVerifiedAt: true },
  });
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Accounts must confirm their email address before they can book.
export async function requireVerifiedUser() {
  const user = await requireUser();
  if (!user.emailVerifiedAt) redirect("/verifica-email");
  return user;
}

export async function requireAdmin() {
  const user = await requireVerifiedUser();
  if (user.role !== "ADMIN") redirect("/prenota");
  return user;
}
