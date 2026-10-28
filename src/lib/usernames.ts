import type { PrismaClient } from "@prisma/client";
import { baseUsername } from "./people";

// surname.name, or surname.name2, surname.name3… when it's already taken.
export async function availableUsername(
  db: Pick<PrismaClient, "user">,
  user: { firstName: string; lastName: string },
) {
  const base = baseUsername(user);
  const rows = await db.user.findMany({ where: { username: { startsWith: base } }, select: { username: true } });
  const taken = new Set(rows.map((r) => r.username));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}${n}`)) return `${base}${n}`;
}
