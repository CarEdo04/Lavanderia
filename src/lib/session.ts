import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "./db";
import { supabaseServer } from "./supabase";

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

export type CurrentUser = {
  id: number;
  authId: string;
  email: string;
  firstName: string;
  lastName: string;
  room: string | null;
  role: string;
  emailVerifiedAt: Date | null;
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
      firstName: true,
      lastName: true,
      room: true,
      role: true,
      emailVerifiedAt: true,
    },
  });
  if (user && !user.emailVerifiedAt && data.user.email_confirmed_at) {
    user.emailVerifiedAt = new Date(data.user.email_confirmed_at);
    await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: user.emailVerifiedAt } });
  }
  return user;
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
