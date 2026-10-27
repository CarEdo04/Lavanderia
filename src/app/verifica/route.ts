import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { verifyEmailToken } from "@/lib/verification";

// Target of the link in the verification email.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const verified = token ? await verifyEmailToken(token) : null;
  const loggedIn = await getCurrentUser();

  if (!verified) redirect(loggedIn ? "/verifica-email?esito=link-non-valido" : "/login?esito=link-non-valido");
  redirect(loggedIn ? "/prenota?esito=email-verificata" : "/login?esito=email-verificata");
}
