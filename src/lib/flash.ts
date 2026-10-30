import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

// The outcome of an action (a code from ESITI in src/lib/messages.ts), shown
// once on the page the action redirects to. It travels in a short-lived
// cookie rather than in the URL, so it doesn't come back on reload, on Back
// or in a shared link: <Flash> deletes it as soon as it's on screen.
const FLASH = "esito";

export async function setFlash(code: string) {
  // The random part tells two identical messages in a row apart.
  (await cookies()).set(FLASH, `${code}.${randomBytes(4).toString("hex")}`, {
    httpOnly: false, // <Flash> deletes it from the browser
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60,
  });
}

export async function readFlash() {
  const value = (await cookies()).get(FLASH)?.value;
  const code = value?.split(".")[0];
  return value && code ? { id: value, code } : null;
}
