import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

try {
  process.loadEnvFile();
} catch {
  // .env is optional when variables are already set
}

const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  const email = (process.env.ADMIN_EMAIL ?? "admin@lavanderia.test").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("Imposta ADMIN_PASSWORD nel file .env prima di eseguire il seed");

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Amministratore",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(password, 10),
    },
  });

  if ((await prisma.machine.count()) === 0) {
    await prisma.machine.createMany({
      data: [
        { name: "Lavatrice 1", type: "WASHER", sortOrder: 1 },
        { name: "Lavatrice 2", type: "WASHER", sortOrder: 2 },
        { name: "Asciugatrice 1", type: "DRYER", sortOrder: 3 },
      ],
    });
  }

  console.log(`Seed completato. Admin: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
