import Link from "next/link";

export const pageSize = 50;

export function pageNumber(value: string | undefined, total: number) {
  const last = Math.max(1, Math.ceil(total / pageSize));
  const requested = Number(value);
  return Number.isSafeInteger(requested) ? Math.min(Math.max(1, requested), last) : 1;
}

export function Pagination({ page, total, base }: { page: number; total: number; base: string }) {
  const pages = Math.ceil(total / pageSize);
  if (pages < 2) return null;
  const href = (n: number) => base + (base.includes("?") ? "&" : "?") + "page=" + n;
  return <nav aria-label="Pages" className="my-4 flex flex-wrap items-center gap-4 text-sm">
    {page > 1 && <Link className="underline" href={href(page - 1)}>Previous</Link>}
    <span>Page {page} of {pages}</span>
    {page < pages && <Link className="underline" href={href(page + 1)}>Next</Link>}
  </nav>;
}
