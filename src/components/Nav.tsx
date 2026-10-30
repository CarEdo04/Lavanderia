"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookIcon, CalendarIcon, SettingsIcon, TicketIcon } from "./Icons";

const SECTIONS = [
  { href: "/prenota", label: "Prenota", Icon: CalendarIcon, admin: false },
  { href: "/mie-prenotazioni", label: "I miei turni", Icon: TicketIcon, admin: false },
  { href: "/regolamento", label: "Regolamento", Icon: BookIcon, admin: false },
  { href: "/admin", label: "Gestione", Icon: SettingsIcon, admin: true },
];

function useSections(isAdmin: boolean) {
  const path = usePathname();
  return SECTIONS.filter((s) => !s.admin || isAdmin).map((s) => ({
    ...s,
    current: path === s.href || path.startsWith(`${s.href}/`),
  }));
}

// Links in the header, from tablet width up (where the tab bar goes away).
export function TopNav({ isAdmin }: { isAdmin: boolean }) {
  return (
    <nav aria-label="Sezioni" className="hidden gap-1 text-[15px] md:flex">
      {useSections(isAdmin).map(({ href, label, current }) => (
        <Link
          key={href}
          href={href}
          aria-current={current ? "page" : undefined}
          className={`flex min-h-11 items-center rounded-xl px-3.5 ${
            current ? "bg-brand-soft font-semibold text-brand" : "text-ink-2 hover:bg-ground hover:text-ink"
          }`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

// Phones and small tablets: a tab bar at the bottom of the screen, within thumb reach.
export function TabBar({ isAdmin }: { isAdmin: boolean }) {
  const sections = useSections(isAdmin);
  return (
    <nav
      aria-label="Sezioni"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className={`grid ${sections.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
        {sections.map(({ href, label, Icon, current }) => (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`flex h-[68px] flex-col items-center justify-center gap-1 text-xs ${
              current ? "font-semibold text-brand" : "font-medium text-ink-2"
            }`}
          >
            <Icon />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
