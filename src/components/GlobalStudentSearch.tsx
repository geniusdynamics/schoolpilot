// ABOUTME: Global learner finder in the app header: search by admission number or name and open the canonical student profile.
// ABOUTME: The canonical database is opened lazily on the first query, so the header renders without touching storage.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { openCanonicalRepository } from '@/data/canonicalRepository';

interface LearnerHit {
  readonly id: string;
  readonly admission_number: string;
  readonly name: string;
}

const SEARCH_FIELDS = [
  'admission_number',
  'given_name',
  'middle_names',
  'family_name',
  'preferred_name',
] as const;

export interface GlobalStudentSearchProps {
  readonly className?: string;
}

export const GlobalStudentSearch: React.FC<GlobalStudentSearchProps> = ({ className = '' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<readonly LearnerHit[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(() => {
      void openCanonicalRepository()
        .then((repository) =>
          repository.list('learner', {
            search: { term: query, fields: SEARCH_FIELDS },
            orderBy: [{ field: 'family_name', direction: 'asc' }],
            limit: 10,
          })
        )
        .then((page) => {
          if (cancelled) return;
          setResults(
            page.items.map((row) => ({
              id: row.id,
              admission_number: row.admission_number,
              name: `${row.preferred_name ?? row.given_name} ${row.family_name}`.trim(),
            }))
          );
          setActive(0);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term]);

  const choose = useCallback((hit: LearnerHit) => {
    window.location.assign(`/administration/students/${hit.id}`);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!open || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => (current + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (current - 1 + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const hit = results[active];
      if (hit) choose(hit);
    }
  };

  const showDropdown = open && term.trim().length >= 2;
  const label = useMemo(
    () => (searching ? 'Searching learners...' : results.length === 0 ? 'No learners match' : null),
    [searching, results.length]
  );

  return (
    <div className={`relative w-full ${className}`}>
      <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
        <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        ref={inputRef}
        type="search"
        value={term}
        onChange={(event) => {
          setTerm(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="Search learners (Ctrl K)"
        aria-label="Search learners by name or admission number"
        aria-expanded={showDropdown}
        aria-controls="global-student-results"
        className="w-full rounded-lg border border-slate-200/50 bg-slate-50/80 py-2 pe-4 ps-10 text-sm text-slate-700 shadow-sm transition-all placeholder-slate-400 hover:bg-white/60 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 dark:bg-slate-900/60 dark:text-slate-100"
      />
      {showDropdown ? (
        <div
          id="global-student-results"
          role="listbox"
          className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-surface-border bg-surface-popover p-1 shadow-lg"
        >
          {label ? <p className="px-3 py-2 text-sm text-surface-muted-fg">{label}</p> : null}
          {results.map((hit, index) => (
            <a
              key={hit.id}
              href={`/administration/students/${hit.id}`}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(hit)}
              className={`block rounded-md px-3 py-2 text-sm ${
                index === active
                  ? 'bg-primary-50 text-primary-900 dark:bg-primary-500/15'
                  : 'text-surface-foreground hover:bg-surface-muted'
              }`}
            >
              <span className="block font-medium">{hit.name}</span>
              <span className="block text-xs text-surface-muted-fg">{hit.admission_number}</span>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default GlobalStudentSearch;
