// Placeholder shown while a page's data loads, shaped like a title, its intro
// and a card.
export default function Loading() {
  const bar = "rounded-lg bg-line-soft";
  return (
    <div role="status" className="animate-pulse">
      <span className="sr-only">Caricamento…</span>
      <div aria-hidden>
        <div className={`${bar} mb-2 h-3.5 w-40`} />
        <div className={`${bar} h-8 w-64 max-w-full`} />
        <div className={`${bar} mt-3 h-4 w-full max-w-xl`} />
        <div className={`${bar} mt-2 mb-6 h-4 w-3/4 max-w-md`} />
        <div className="h-72 rounded-[18px] border border-line bg-white" />
      </div>
    </div>
  );
}
