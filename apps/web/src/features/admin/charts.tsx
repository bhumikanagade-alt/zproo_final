import { cn } from '@zproo/ui';
import { useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * Dependency-free charts for the admin panel (no chart library in the bundle). Thin marks,
 * recessive grid, one y-axis, hover tooltips, and a visually hidden table for screen readers.
 */

export interface Point {
  /** ISO date or label shown on the x-axis and in the tooltip. */
  label: string;
  value: number;
}

const SERIES = '#2a78d6';

/** A round step (1, 2, 5 × 10ⁿ) so every axis label is an even multiple of one step. */
function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(raw));
  const f = raw / exp;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * exp;
}

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(max));
  const f = max / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

export function LineChart({
  points,
  format,
  formatLabel = (l) => l,
  height = 240,
  title,
  color = SERIES,
}: {
  points: Point[];
  format: (v: number) => string;
  formatLabel?: (label: string) => string;
  height?: number;
  title: string;
  color?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = height;
  const pad = { l: 56, r: 12, t: 12, b: 28 };
  const { min, max, ticks } = useMemo(() => {
    const values = points.map((p) => p.value);
    const lo = Math.min(0, ...values);
    const hi = Math.max(0, ...values);
    // One common step, with both ends rounded to it, so labels read 0, 50K, 100K … even when negative.
    const step = niceStep((hi - lo || 1) / 4);
    const min = Math.floor(lo / step) * step;
    const max = Math.max(Math.ceil(hi / step) * step, min + step);
    const ticks: number[] = [];
    for (let t = min; t <= max + step / 2; t += step) ticks.push(t);
    return { min, max, ticks };
  }, [points]);
  const x = (i: number) => pad.l + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min || 1)) * (H - pad.t - pad.b);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
  const area = points.length ? `${line}L${x(points.length - 1)},${y(Math.max(0, min))}L${x(0)},${y(Math.max(0, min))}Z` : '';
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));

  const onMove = (e: React.PointerEvent) => {
    const svg = ref.current;
    if (!svg || !points.length) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };
  const hp = hover !== null ? points[hover] : undefined;

  return (
    <figure className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label={title}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeDasharray={t === 0 ? undefined : '3 4'} />
            <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px]">
              {format(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text key={p.label} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} className="fill-muted text-[11px]">
              {formatLabel(p.label)}
            </text>
          ) : null,
        )}
        <path d={area} fill={color} opacity={0.1} />
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hp && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="#9ca3af" />
            <circle cx={x(hover)} cy={y(hp.value)} r={5} fill={color} stroke="#fff" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hp && hover !== null && (
        <div
          className="pointer-events-none absolute top-1 z-10 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-raised"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > points.length / 2 ? '-105%' : '5%'})` }}
        >
          <div className="text-muted">{formatLabel(hp.label)}</div>
          <div className="font-bold tabular-nums">{format(hp.value)}</div>
        </div>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.label}>
              <th scope="row">{formatLabel(p.label)}</th>
              <td>{format(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export interface BarItem {
  label: ReactNode;
  key: string;
  value: number;
  display: string;
  hint?: string;
  color?: string;
}

/** Horizontal bars with direct labels: best for comparing a handful of categories. */
export function BarList({ items, className, empty = 'No data for this period.' }: { items: BarItem[]; className?: string; empty?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => (
        <li key={item.key} title={item.hint}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 truncate font-semibold">
              {item.color && <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: item.color }} />}
              {item.label}
            </span>
            <span className="shrink-0 tabular-nums text-muted">
              <span className="font-bold text-foreground">{item.display}</span>
              {item.hint && <span className="ml-1.5 hidden sm:inline">{item.hint}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-background">
            <div className="h-full rounded-full" style={{ width: `${Math.max(1.5, (item.value / max) * 100)}%`, background: item.color ?? SERIES }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Daily columns (e.g. bookings per day) with a hover tooltip per column. */
export function ColumnChart({
  points,
  format,
  formatLabel = (l) => l,
  title,
  height = 160,
  color = SERIES,
}: {
  points: Point[];
  format: (v: number) => string;
  formatLabel?: (label: string) => string;
  title: string;
  height?: number;
  color?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)));
  const last = points.at(-1);
  const gap = points.length > 60 ? 0 : 2;
  return (
    <figure className="relative">
      <div className="flex items-end" style={{ height, gap }} role="img" aria-label={title} onPointerLeave={() => setHover(null)}>
        {points.map((p, i) => (
          <div key={p.label} className="flex h-full flex-1 items-end" onPointerEnter={() => setHover(i)}>
            <div
              className="w-full rounded-t-[3px] transition-opacity"
              style={{ height: `${(p.value / max) * 100}%`, minHeight: p.value ? 2 : 0, background: color, opacity: hover === null || hover === i ? 1 : 0.45 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-muted">
        <span>{points[0] && formatLabel(points[0].label)}</span>
        <span>{last && formatLabel(last.label)}</span>
      </div>
      {hover !== null && points[hover] && (
        <div
          className="pointer-events-none absolute -top-2 z-10 rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-raised"
          style={{ left: `${((hover + 0.5) / points.length) * 100}%`, transform: `translate(${hover > points.length / 2 ? '-105%' : '5%'}, -100%)` }}
        >
          <div className="text-muted">{formatLabel(points[hover].label)}</div>
          <div className="font-bold tabular-nums">{format(points[hover].value)}</div>
        </div>
      )}
      <table className="sr-only">
        <caption>{title}</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.label}>
              <th scope="row">{formatLabel(p.label)}</th>
              <td>{format(p.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
