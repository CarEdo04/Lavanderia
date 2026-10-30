import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile();
} catch {
  // .env is optional when variables are already set
}

function env(name: string): string {
  const value = process.env[name] || process.env[`NEXT_PUBLIC_${name}`];
  if (!value) throw new Error(`Imposta ${name} nel file .env prima di eseguire il seed`);
  return value;
}

const prisma = new PrismaClient();
const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const names = { firstName: "Amministratore", lastName: "" };

// Creates the admin in Supabase Auth, or finds it when it already exists. Like
// any sign-up, a new account needs a PendingSignup token: the database trigger
// creates its User row from it.
async function adminAuthId(email: string, password: string) {
  const token = randomBytes(32).toString("hex");
  await prisma.pendingSignup.create({ data: { token, email, ...names } });
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { signup_token: token },
  });
  await prisma.pendingSignup.deleteMany({ where: { token } });
  if (data.user) return data.user.id;
  if (error?.code !== "email_exists") throw error;

  for (let page = 1; ; page++) {
    const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (listError) throw listError;
    const found = list.users.find((u) => u.email?.toLowerCase() === email);
    if (found) return found.id;
    if (list.users.length < 1000) throw new Error(`Utente ${email} non trovato in Supabase Auth`);
  }
}

async function main() {
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  const email = (process.env.ADMIN_EMAIL ?? "admin@lavanderia.test").toLowerCase();
  const authId = await adminAuthId(email, env("ADMIN_PASSWORD"));

  // The trigger made a plain profile for a new account; an account that
  // already existed may have none yet.
  const profile = await prisma.user.findUnique({ where: { email } });
  if (profile) {
    await prisma.user.update({
      where: { id: profile.id },
      data: { authId, role: "ADMIN", emailVerifiedAt: profile.emailVerifiedAt ?? new Date() },
    });
  } else {
    const [{ username }] = await prisma.$queryRaw<{ username: string }[]>`
      SELECT private.available_username(${names.firstName}, ${names.lastName}) AS username`;
    await prisma.user.create({
      data: { authId, email, ...names, username, emailVerifiedAt: new Date(), role: "ADMIN" },
    });
  }

  if ((await prisma.machine.count()) === 0) {
    await prisma.machine.create({ data: { name: "Lavanderia", type: "WASHER", sortOrder: 1 } });
  }

  console.log(`Seed completato. Admin: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
