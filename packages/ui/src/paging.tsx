import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button.js';

export const PAGE_SIZE = 25;

/** "26–50 of 132" with previous / next. Renders nothing while everything fits on one page. */
export function Pager({ page, pageSize = PAGE_SIZE, total, onPage }: { page: number; pageSize?: number; total: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm text-muted">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-2">
        <span className="hidden sm:inline">
          Page {page} of {pages}
        </span>
        <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft />
        </Button>
        <Button variant="outline" size="icon-sm" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}

/**
 * Pages over a list that is already in the browser. `resetKey`: when it changes (another tab, another
 * search) the list starts at page 1 again. Returns the rows to show and the props for <Pager>.
 */
export function usePaged<T>(items: readonly T[], resetKey: unknown = '', pageSize = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [resetKey]);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages); // the list got shorter under us
  return { rows: items.slice((current - 1) * pageSize, current * pageSize), pager: { page: current, pageSize, total: items.length, onPage: setPage } };
}
