import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CategorisedPhoto, PhotoCategory } from '../extras';
import { PHOTO_CATEGORIES } from '../extras';

interface Props {
  images: readonly string[];
  name: string;
  /** Optional photos sorted into Rooms / Pool / Food / Exterior tabs. “All” shows `images`. */
  categories?: readonly CategorisedPhoto[];
}

/** Main image, thumbnails and a fullscreen viewer with keyboard support. */
export function Gallery({ images: allImages, name, categories }: Props) {
  const [category, setCategory] = useState<PhotoCategory>('All');
  const images = useMemo(
    () => (categories && category !== 'All' ? categories.filter((p) => p.category === category).map((p) => p.src) : allImages),
    [allImages, categories, category],
  );
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const count = images.length;
  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go]);

  const tabs = categories ? PHOTO_CATEGORIES.filter((c) => c === 'All' || categories.some((p) => p.category === c)) : [];
  if (count === 0 && tabs.length === 0) return null;
  const current = images[index] ?? images[0] ?? '';

  return (
    <section aria-label={`${name} photos`}>
      {tabs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-3 pt-3" role="group" aria-label="Photo categories">
          {tabs.map((c) => (
            <button key={c} type="button" aria-pressed={c === category} onClick={() => { setCategory(c); setIndex(0); }} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold ring-1 ${c === category ? 'bg-primary text-primary-foreground ring-primary' : 'bg-background ring-border'}`}>
              {c}
            </button>
          ))}
        </div>
      )}
      <div className="relative h-64 overflow-hidden bg-background sm:h-96">
        <img src={current} alt={`${name}, view ${index + 1} of ${count}`} className="size-full object-cover" />
        <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white"><ChevronLeft aria-hidden /></button>
        <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white"><ChevronRight aria-hidden /></button>
        <span aria-live="polite" className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">{index + 1} / {count}</span>
        <button type="button" onClick={() => setOpen(true)} aria-label="Open fullscreen gallery" className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white"><Expand aria-hidden className="size-3.5" /> Fullscreen</button>
      </div>
      <div className="flex gap-2 overflow-x-auto p-3" role="tablist" aria-label="Photo thumbnails">
        {images.map((src, i) => (
          <button key={src + i} type="button" role="tab" aria-selected={i === index} aria-label={`Show photo ${i + 1}`} onClick={() => setIndex(i)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${i === index ? 'border-primary' : 'border-transparent opacity-70'}`}>
            <img src={src} alt="" className="size-full object-cover" />
          </button>
        ))}
      </div>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={`${name} gallery`} className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-4">
          <button type="button" onClick={() => setOpen(false)} aria-label="Close gallery" className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/15 text-white"><X aria-hidden /></button>
          <button type="button" onClick={() => go(-1)} aria-label="Previous photo in gallery" className="absolute left-4 grid size-12 place-items-center rounded-full bg-white/15 text-white"><ChevronLeft aria-hidden /></button>
          <img src={current} alt={`${name}, view ${index + 1} of ${count}`} className="max-h-[85vh] max-w-full rounded-lg object-contain" />
          <button type="button" onClick={() => go(1)} aria-label="Next photo in gallery" className="absolute right-4 grid size-12 place-items-center rounded-full bg-white/15 text-white"><ChevronRight aria-hidden /></button>
          <p className="absolute bottom-4 text-sm font-bold text-white">{index + 1} / {count}</p>
        </div>
      )}
    </section>
  );
}
