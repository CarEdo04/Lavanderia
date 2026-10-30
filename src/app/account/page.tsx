import type { ReactNode } from "react";
import { logout } from "../actions";
import { DeleteAccountForm, EmailForm, PasswordForm, ProfileForm } from "@/components/AccountForms";
import { Flash } from "@/components/Flash";
import { LogoutIcon } from "@/components/Icons";
import { prisma } from "@/lib/db";
import { requireVerifiedUser } from "@/lib/session";
import { formatDate } from "@/lib/time";

export const metadata = { title: "Il tuo account · Lavanderia" };

function Section({ id, title, intro, danger, children }: { id: string; title: string; intro?: ReactNode; danger?: boolean; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={`rounded-[18px] border bg-white p-5 sm:p-6 ${danger ? "border-red-200" : "border-line"}`}>
      <h2 id={id} className={`text-lg font-semibold ${danger ? "text-red-800" : ""}`}>
        {title}
      </h2>
      {intro && <p className="mt-1 text-sm leading-snug text-ink-2">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function AccountPage() {
  const user = await requireVerifiedUser();
  const [profile, upcoming, past] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { createdAt: true } }),
    prisma.booking.count({ where: { userId: user.id, start: { gt: new Date() } } }),
    prisma.booking.count({ where: { userId: user.id, start: { lte: new Date() } } }),
  ]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">Il tuo account</h1>
      <p className="mt-1 mb-5 text-sm text-ink-2">Registrato il {formatDate(profile.createdAt)}.</p>
      <Flash />

      <div className="space-y-4">
        <Section id="dati" title="Dati personali" intro="Il nome compare sui turni che prenoti.">
          <ProfileForm firstName={user.firstName} lastName={user.lastName} room={user.room ?? ""} username={user.username}
            isAdmin={user.role === "ADMIN"}
          />
        </Section>

        <Section id="email" title="Email" intro="Serve per accedere e per recuperare la password.">
          <EmailForm email={user.email} pending={user.emailChangeTo} />
        </Section>

        <Section id="password" title="Password">
          <PasswordForm />
        </Section>

        <form action={logout}>
          <button className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-line bg-white font-medium text-ink hover:bg-ground">
            <LogoutIcon />
            Esci
          </button>
        </form>

        <Section
          id="elimina"
          title="Elimina account"
          danger
          intro={
            <>
              I turni in programma vengono annullati e non potrai più accedere.
              {past > 0 && " I turni passati restano nello storico della lavanderia, senza il tuo nome."}
            </>
          }
        >
          <DeleteAccountForm upcoming={upcoming} />
        </Section>
      </div>
    </div>
  );
}
