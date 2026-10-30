import { createHmac, timingSafeEqual } from "node:crypto";
import type { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./db";
import { env, supabaseServer } from "./supabase";

// Remembers who just registered (or tried to log in unconfirmed), so the
// "check your email" page can show the address and resend the link.
const PENDING_EMAIL = "email-da-confermare";

export async function rememberPendingEmail(email: string) {
  (await cookies()).set(PENDING_EMAIL, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function pendingEmail() {
  return (await cookies()).get(PENDING_EMAIL)?.value ?? null;
}

export async function forgetPendingEmail() {
  (await cookies()).delete(PENDING_EMAIL);
}

// Opening the link in a password-reset email lets that browser choose a new
// password without the current one, for a limited time. Elsewhere the current
// password is needed (account page), so someone who gets hold of a signed-in
// session can't take the account over. The cookie is signed with a key derived
// from the Supabase secret key: a session alone isn't enough to make one.
const PASSWORD_RESET = "reimposta-password";
const PASSWORD_RESET_MINUTES = 30;

function sign(value: string) {
  const key = createHmac("sha256", env("SUPABASE_SECRET_KEY")).update(PASSWORD_RESET).digest();
  return createHmac("sha256", key).update(value).digest("base64url");
}

export async function allowPasswordReset(authId: string) {
  const value = `${authId}.${Date.now() + PASSWORD_RESET_MINUTES * 60_000}`;
  (await cookies()).set(PASSWORD_RESET, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PASSWORD_RESET_MINUTES * 60,
  });
}

export async function canResetPassword(authId: string) {
  const [id, expires, mac] = (await cookies()).get(PASSWORD_RESET)?.value.split(".") ?? [];
  if (!id || !expires || !mac) return false;
  const expected = Buffer.from(sign(`${id}.${expires}`));
  const given = Buffer.from(mac);
  return (
    given.length === expected.length && timingSafeEqual(given, expected) && id === authId && Number(expires) > Date.now()
  );
}

export async function forgetPasswordReset() {
  (await cookies()).delete(PASSWORD_RESET);
}

export type CurrentUser = {
  id: number;
  authId: string;
  email: string;
  username: string | null;
  firstName: string;
  lastName: string;
  room: string | null;
  role: Role;
  emailVerifiedAt: Date | null;
  /** The new address of an email change still waiting to be confirmed. */
  emailChangeTo: string | null;
};

// Supabase says who is signed in; the resident profile and role come from our
// database on every request, so promotions and demotions apply immediately.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const user = await prisma.user.findUnique({
    where: { authId: data.user.id },
    select: {
      id: true,
      authId: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      room: true,
      role: true,
      emailVerifiedAt: true,
    },
  });
  if (!user) return null;
  if (!user.emailVerifiedAt && data.user.email_confirmed_at) {
    user.emailVerifiedAt = new Date(data.user.email_confirmed_at);
    await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: user.emailVerifiedAt } });
  }
  // A change of address confirmed from the account page (see src/app/auth/conferma).
  const email = data.user.email?.toLowerCase();
  if (email && email !== user.email) {
    try {
      await prisma.user.update({ where: { id: user.id }, data: { email } });
      user.email = email;
    } catch (e) {
      console.error("Aggiornamento email non riuscito", e);
    }
  }
  return { ...user, emailChangeTo: data.user.new_email ?? null };
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
