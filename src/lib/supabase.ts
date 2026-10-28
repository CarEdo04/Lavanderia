import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Also accepts the NEXT_PUBLIC_ names used in Supabase's Next.js snippet.
export function env(name: string): string {
  const value = process.env[name] || process.env[`NEXT_PUBLIC_${name}`];
  if (!value) throw new Error(`${name} mancante nel file .env`);
  return value;
}

export function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

// Acts as the visitor; their Supabase session is kept in cookies.
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(env("SUPABASE_URL"), env("SUPABASE_PUBLISHABLE_KEY"), {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components cannot set cookies; the middleware refreshes the session instead.
        }
      },
    },
  });
}

// Full access to Supabase Auth with the secret key. Server only.
export function supabaseAdmin() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
