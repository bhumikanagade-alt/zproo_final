import { Button, cn } from '@zproo/ui';
import { Search } from 'lucide-react';

export function SearchButton({ label, className }: { label: string; className?: string }) {
  return (
    <Button
      type="submit"
      size="lg"
      className={cn('h-14 w-full text-base shadow-md shadow-primary/25', className)}
    >
      <Search aria-hidden className="size-5!" /> {label}
    </Button>
  );
}
