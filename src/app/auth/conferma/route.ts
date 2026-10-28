import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { forgetPendingEmail } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase";

// Target of the links in Supabase's emails (signup confirmation and password
// reset). Works with the recommended templates (?token_hash=…&type=…) and
// with the default ones (?code=…, only in the browser that asked for it).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");
  const recovery = type === "recovery" || params.get("next") === "/nuova-password";

  const supabase = await supabaseServer();
  const { error } =
    tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : code
        ? await supabase.auth.exchangeCodeForSession(code)
        : { error: new Error("link senza codice") };

  if (error) redirect("/login?esito=link-non-valido");
  await forgetPendingEmail();
  redirect(recovery ? "/nuova-password" : "/prenota?esito=email-verificata");
}
