import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Same lookup as src/lib/supabase.ts, which can't be imported here (it uses next/headers).
const env = (name: string) => process.env[name] || process.env[`NEXT_PUBLIC_${name}`] || "";

// Refreshes the Supabase session cookies on every request, because Server
// Components can read cookies but not write them.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(env("SUPABASE_URL"), env("SUPABASE_PUBLISHABLE_KEY"), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
