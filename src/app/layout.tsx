import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { logout } from "./actions";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

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
  const link = "rounded-md px-2.5 py-1.5 text-slate-700 hover:bg-slate-100";

  return (
    <html lang="it">
      <body className={`${geistSans.variable} antialiased`}>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
              <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-sky-600 text-sm text-white">
                L
              </span>
              Lavanderia
            </Link>
            {user && (
              <nav className="ml-auto flex flex-wrap items-center gap-1 text-sm">
                <Link href="/prenota" className={link}>
                  Prenota
                </Link>
                <Link href="/mie-prenotazioni" className={link}>
                  Le mie prenotazioni
                </Link>
                {user.role === "ADMIN" && (
                  <Link href="/admin" className={link}>
                    Gestione
                  </Link>
                )}
                <form action={logout}>
                  <button className="rounded-md px-2.5 py-1.5 text-slate-500 hover:bg-slate-100">
                    Esci ({user.name.split(" ")[0]})
                  </button>
                </form>
              </nav>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
