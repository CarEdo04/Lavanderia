import { headers } from "next/headers";
import { prisma } from "./db";

// Failed logins and wrong registration codes, counted per IP address and per
// account over a sliding window. Supabase's own limits can't tell residents
// apart, because every request reaches it from the server's address.
const LIMITS = {
  LOGIN: { minutes: 15, ip: 20, account: 10 },
  CODE: { minutes: 60, ip: 10, account: Infinity },
};

type Attempt = { kind: keyof typeof LIMITS; ip: string; account?: string };

// Vercel sets x-real-ip to the visitor's address.
export async function clientIp() {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

const keys = ({ ip, account }: Attempt) => [`ip:${ip}`, ...(account ? [`account:${account}`] : [])];

export async function isThrottled(attempt: Attempt) {
  const limit = LIMITS[attempt.kind];
  const since = new Date(Date.now() - limit.minutes * 60_000);
  const [byIp, byAccount = 0] = await Promise.all(
    keys(attempt).map((key) => prisma.authFailure.count({ where: { kind: attempt.kind, key, createdAt: { gte: since } } })),
  );
  return byIp >= limit.ip || byAccount >= limit.account;
}

export async function recordFailure(attempt: Attempt) {
  await prisma.authFailure.createMany({ data: keys(attempt).map((key) => ({ kind: attempt.kind, key })) });
  // Nothing older than a day is ever counted.
  await prisma.authFailure.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 86_400_000) } } });
}

// After a successful login, earlier mistakes on that account no longer count.
export async function clearFailures(attempt: Attempt) {
  if (attempt.account) {
    await prisma.authFailure.deleteMany({ where: { kind: attempt.kind, key: `account:${attempt.account}` } });
  }
}
