import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { setFlash } from "@/lib/flash";
import { allowPasswordReset, forgetPendingEmail } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase";

// Target of the links in Supabase's emails (signup confirmation, password
// reset and email change). Works with the recommended templates
// (?token_hash=…&type=…) and with the default ones (?code=…, only in the
// browser that asked for it).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;
  const code = params.get("code");
  // The default templates' links carry no type, only the `next` the app asked for.
  const recovery = tokenHash ? type === "recovery" : params.get("next") === "/nuova-password";
  const emailChange = tokenHash ? type === "email_change" : params.get("next") === "/account";

  const supabase = await supabaseServer();
  const { error } =
    tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : code
        ? await supabase.auth.exchangeCodeForSession(code)
        : { error: new Error("link senza codice") };

  if (error) {
    await setFlash("link-non-valido");
    redirect("/login");
  }
  if (recovery) {
    const { data } = await supabase.auth.getUser();
    if (data.user) await allowPasswordReset(data.user.id);
    redirect("/nuova-password");
  }
  if (emailChange) {
    // With Supabase's "secure email change" both the old and the new address
    // get a link, and the change happens once both have been opened.
    const { data } = await supabase.auth.getUser();
    await setFlash(data.user?.new_email ? "email-altro-link" : "email-aggiornata");
    redirect("/account");
  }
  await forgetPendingEmail();
  await setFlash("email-verificata");
  redirect("/prenota");
}
