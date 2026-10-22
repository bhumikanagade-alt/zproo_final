import { useEffect, useState } from 'react';

const query = '(prefers-reduced-motion: reduce)';

/** True when the visitor asked the OS for reduced motion (SMIL/CSS animations are skipped). */
export function useReducedMotion(): boolean {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    if (typeof matchMedia === 'undefined') return;
    const m = matchMedia(query);
    setRm(m.matches);
    const on = () => setRm(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return rm;
}

/** Fades `.rv` elements in as they scroll into view. */
export function useReveal(deps: unknown[] = []) {
  const rm = useReducedMotion();
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.pcl .rv'));
    if (rm || typeof IntersectionObserver === 'undefined') { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.1 });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rm, ...deps]);
}

/** Animates a number towards `value` (ease-out) unless reduced motion is requested. */
export function useCountUp(value: number | null): number | null {
  const rm = useReducedMotion();
  const [shown, setShown] = useState<number | null>(value);
  useEffect(() => {
    if (value === null || rm) { setShown(value); return; }
    let raf = 0;
    const from = shown ?? value;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 450);
      setShown(from + (value - from) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    if (from === value) { setShown(value); return; }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, rm]);
  return shown;
}
