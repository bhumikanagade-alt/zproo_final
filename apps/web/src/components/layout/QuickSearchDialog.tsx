import { Dialog, DialogContent, DialogDescription, DialogTitle, Input } from '@zproo/ui';
import { ArrowRight, Search } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { filterQuickSearch } from './quickSearch';

interface QuickSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Jump to any service or account page. Opens from the header or with Ctrl/⌘+K or "/". */
export function QuickSearchDialog({ open, onOpenChange }: QuickSearchDialogProps) {
  const navigate = useNavigate();
  const listId = useId();
  const [query, setQuery] = useState('');
  const results = useMemo(() => filterQuickSearch(query), [query]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setQuery('');
    onOpenChange(next);
  };

  const go = (path: string) => {
    handleOpenChange(false);
    void navigate(path);
  };

  // Radix focuses the first focusable element (the search input) when the dialog opens.
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="p-0">
        <div className="border-b border-border p-4 pr-14">
          <DialogTitle className="sr-only">Search ZPROO GO</DialogTitle>
          <DialogDescription className="sr-only">
            Type to find a service or page, then press Enter.
          </DialogDescription>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && results[0]) go(results[0].path);
              }}
              placeholder="Where do you want to go? Try “bus” or “wallet”"
              aria-label="Search services and pages"
              aria-controls={listId}
              className="pl-10"
            />
          </div>
        </div>
        <ul id={listId} className="max-h-[50vh] overflow-y-auto p-2" aria-label="Results">
          {results.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted">No matches for “{query}”</li>
          )}
          {results.map((entry) => (
            <li key={entry.label}>
              <button
                type="button"
                onClick={() => go(entry.path)}
                className="group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-primary-light focus-visible:bg-primary-light focus-visible:outline-none"
              >
                <span>
                  <span className="block text-sm font-semibold">{entry.label}</span>
                  <span className="block text-xs text-muted">{entry.hint}</span>
                </span>
                <ArrowRight
                  aria-hidden
                  className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
                />
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
