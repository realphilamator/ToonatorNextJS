"use client";
import Link from "next/link";

export function calculateTotalPages(totalItems, itemsPerPage = 12) {
  return Math.ceil(totalItems / itemsPerPage);
}

const WINDOW = 5;

function buildPages(currentPage, totalPages) {
  let start = Math.max(1, currentPage - Math.floor(WINDOW / 2));
  let end = start + WINDOW - 1;
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - WINDOW + 1);
  }
  const pages = [];
  for (let p = start; p <= end; p++) pages.push(p);
  return { pages, start, end };
}

/**
 * URL-driven paginator — uses Next.js <Link> with /basePath/N segments.
 * Page 1 links to basePath directly (no /1 suffix).
 * Use for server-component pages (e.g. /last, /sandbox).
 */
export function UrlPaginator({ currentPage, totalPages, basePath }) {
  if (!totalPages || totalPages <= 1) return null;
  const { pages, start, end } = buildPages(currentPage, totalPages);

  const href = (p) => (p === 1 ? basePath : `${basePath}/${p}`);

  return (
    <div className="paginator">
      <ul className="paginator">
        {start > 1 && <li className="dots">...</li>}
        {pages.map((p) => (
          <li key={p} className={p === currentPage ? "current" : ""}>
            <Link href={href(p)}>{p}</Link>
          </li>
        ))}
        {end < totalPages && <li className="dots">...</li>}
      </ul>
      <div style={{ clear: "both" }} />
    </div>
  );
}

/**
 * Callback-driven paginator — calls onPageChange(page), no URL change.
 * Use for client-component pages (e.g. user profile tabs).
 * Default export kept for backwards compatibility.
 */
export default function Paginator({ currentPage = 1, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;
  const { pages, start, end } = buildPages(currentPage, totalPages);
  return (
    <div className="paginator">
      <ul className="paginator">
        {start > 1 && <li className="dots">...</li>}
        {pages.map((p) => (
          <li key={p} className={p === currentPage ? "current" : ""}>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); if (p !== currentPage) onPageChange(p); }}
            >
              {p}
            </a>
          </li>
        ))}
        {end < totalPages && <li className="dots">...</li>}
      </ul>
      <div style={{ clear: "both" }} />
    </div>
  );
}