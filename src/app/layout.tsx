import type { Metadata } from "next";
import Link from "next/link";
import { logout } from "./actions";
import { fontVariables } from "./fonts";
import { LogoutIcon, UserIcon, WasherIcon } from "@/components/Icons";
import { MenuLink, TabBar, TopNav } from "@/components/Nav";
import { fullName, initials } from "@/lib/people";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lavanderia",
  description: "Prenotazione delle lavatrici e asciugatrici condominiali",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  return (
    <html lang="it">
      <body className={`${fontVariables} antialiased`}>
        <header className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-x-6 px-4 py-2.5 sm:px-6">
            <Link href="/" className="flex min-h-11 items-center gap-2.5 text-ink">
              <span className="grid size-[34px] place-items-center rounded-[10px] bg-brand text-white">
                <WasherIcon className="size-[22px]" />
              </span>
              <span className="text-lg font-bold tracking-tight">Lavanderia</span>
            </Link>
            {user && (
              <>
                <TopNav isAdmin={isAdmin} />
                <button
                  type="button"
                  popoverTarget="account"
                  className="ml-auto flex h-11 items-center gap-2.5 rounded-full border border-line bg-white px-1.5 text-sm text-ink hover:border-brand-line lg:pl-3.5"
                >
                  <span className="sr-only">Account di </span>
                  <span className="max-lg:sr-only">{user.firstName}</span>
                  <span aria-hidden className="grid size-8 place-items-center rounded-full bg-taken-strong text-xs font-bold">
                    {initials(user)}
                  </span>
                </button>
                <div
                  id="account"
                  popover="auto"
                  // Tailwind's reset drops the popover's own centring; it opens under the
                  // account button instead, at the right edge of the page's column.
                  className="fixed inset-auto top-[4.25rem] right-4 m-0 w-64 rounded-2xl border border-line bg-white p-4 text-sm text-ink shadow-xl sm:right-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]"
                >
                  <p className="font-semibold">{fullName(user)}</p>
                  <p className="truncate text-ink-2">{user.username ?? user.email}</p>
                  <MenuLink
                    href="/account"
                    className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line font-medium hover:bg-ground"
                  >
                    <UserIcon />
                    Il tuo account
                  </MenuLink>
                  <form action={logout} className="mt-2">
                    <button className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line font-medium hover:bg-ground">
                      <LogoutIcon />
                      Esci
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </header>
        <main className={`mx-auto max-w-7xl px-4 pt-6 sm:px-6 ${user ? "pb-28 md:pb-12" : "pb-12"}`}>{children}</main>
        {user && <TabBar isAdmin={isAdmin} />}
      </body>
    </html>
  );
}
