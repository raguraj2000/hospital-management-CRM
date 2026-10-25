import type { ReactNode } from 'react';
import { Card, EmptyState, Paging, cn } from '@platform/ui';
import { Inbox } from 'lucide-react';
import { formatRupees } from '@platform/shared';

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  format?: 'currency' | 'date' | 'datetime' | 'number' | 'text' | 'badge';
  render?: (row: T, index: number) => ReactNode;
}

export interface DynamicTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (newPage: number) => void;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DynamicTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching this criteria.',
  page,
  pageSize,
  total,
  onPageChange,
  onRowClick,
  className,
}: DynamicTableProps<T>) {
  const showPagination = page !== undefined && pageSize !== undefined && total !== undefined && total > pageSize;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-subtle/50 text-xs font-semibold text-muted">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                    col.className,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className="px-4 py-3.5">
                      <div className="h-4 w-3/4 rounded bg-subtle" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8 text-center">
                  <EmptyState
                    icon={Inbox}
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr
                  key={row.id ?? rIdx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'transition-colors hover:bg-subtle/40',
                    onRowClick && 'cursor-pointer',
                  )}
                >
                  {columns.map((col) => {
                    const rawVal = row[col.key];

                    return (
                      <td
                        key={col.key}
                        className={cn(
                          'px-4 py-3 text-ink',
                          col.align === 'right' && 'text-right tabular-nums',
                          col.align === 'center' && 'text-center',
                          col.format === 'currency' && 'tabular-nums font-medium',
                          col.className,
                        )}
                      >
                        {col.render ? (
                          col.render(row, rIdx)
                        ) : (
                          formatValue(rawVal, col.format)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination && onPageChange && (
        <div className="border-t border-border p-3 flex justify-end">
          <Paging
            page={page}
            total={total}
            pageSize={pageSize}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </Card>
  );
}

function formatValue(val: any, format?: ColumnDef<any>['format']): ReactNode {
  if (val === null || val === undefined || val === '') return '—';

  switch (format) {
    case 'currency':
      return typeof val === 'number' ? formatRupees(val) : String(val);
    case 'date':
      try {
        return new Date(val).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      } catch {
        return String(val);
      }
    case 'datetime':
      try {
        return new Date(val).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return String(val);
      }
    case 'number':
      return typeof val === 'number' ? val.toLocaleString('en-IN') : String(val);
    default:
      return String(val);
  }
}

