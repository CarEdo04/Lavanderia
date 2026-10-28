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

// Creates the admin in Supabase Auth, or finds it when it already exists.
async function adminAuthId(email: string, password: string) {
  const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
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

  await prisma.user.upsert({
    where: { email },
    update: { authId },
    create: {
      authId,
      email,
      firstName: "Amministratore",
      lastName: "",
      emailVerifiedAt: new Date(),
      role: "ADMIN",
    },
  });

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
