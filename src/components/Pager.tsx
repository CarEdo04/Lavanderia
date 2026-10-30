import Link from "next/link";

const link =
  "flex min-h-11 items-center gap-1 rounded-xl border border-line bg-white px-3.5 text-sm font-medium text-ink hover:border-brand-line";

// The page number in a query parameter: 1 when missing or not a page that exists.
export function pageParam(value: string | string[] | undefined, pages: number) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= pages ? n : 1;
}

export const pageCount = (total: number, perPage: number) => Math.max(1, Math.ceil(total / perPage));

// "‹ Precedenti · Pagina 2 di 5 · Successivi ›", nothing when there is one page.
export function Pager({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Pagine" className="mt-3 flex items-center justify-between gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className={link} scroll={false}>
          ‹ Precedenti
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-ink-2">
        Pagina {page} di {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={link} scroll={false}>
          Successivi ›
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
