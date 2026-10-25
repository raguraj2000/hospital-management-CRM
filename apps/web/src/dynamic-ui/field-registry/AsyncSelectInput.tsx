import { useEffect, useState, useRef } from 'react';
import { cn } from '@platform/ui';
import { useParams } from 'react-router';
import { api } from '@/core/api/client';
import type { FieldComponentProps } from './types';

interface OptionItem {
  label: string;
  value: string | number;
}

export function AsyncSelectInput({ config, registration, error, disabled }: FieldComponentProps) {
  const { branch } = useParams();
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!config.dataSource || !branch) return;

    abortControllerRef.current?.abort();
    const ac = new AbortController();
    abortControllerRef.current = ac;

    setLoading(true);

    const ds = config.dataSource;
    let url = '';
    
    // Map resource safely from whitelisted catalog
    switch (ds.resource) {
      case 'doctors.list':
        url = `/b/${branch}/doctors`;
        break;
      case 'patients.search':
        url = `/b/${branch}/patients?q=${encodeURIComponent(search)}`;
        break;
      case 'medicines.search':
        url = `/b/${branch}/pharmacy/medicines`;
        break;
      case 'vendors.list':
        url = `/b/${branch}/vendors`;
        break;
      case 'lab_tests.list':
        url = `/b/${branch}/lab/tests`;
        break;
      default:
        setLoading(false);
        return;
    }

    api.get<any>(url, { signal: ac.signal })
      .then((data) => {
        let items: any[] = [];
        if (Array.isArray(data)) {
          items = data;
        } else if (data && Array.isArray(data.items)) {
          items = data.items;
        } else if (data && Array.isArray(data.doctors)) {
          items = data.doctors;
        }

        const mapped: OptionItem[] = items.map((item) => ({
          label: String(item[ds.labelKey ?? 'name'] ?? item.label ?? ''),
          value: item[ds.valueKey ?? 'id'] ?? item.value,
        }));
        setOptions(mapped);
      })
      .catch((err) => {
        if (!ac.signal.aborted) {
          console.error(`Failed loading async options for ${config.name}:`, err);
        }
      })
      .finally(() => {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      });

    return () => ac.abort();
  }, [config.dataSource, branch, search]);

  return (
    <div className="relative">
      <select
        disabled={disabled || config.disabled || loading}
        className={cn(
          'flex h-9 w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-ink shadow-xs transition-colors',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-critical focus-visible:ring-critical',
        )}
        {...registration}
      >
        <option value="">
          {loading ? 'Loading...' : (config.placeholder ?? 'Select...')}
        </option>
        {options.map((opt) => (
          <option key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

