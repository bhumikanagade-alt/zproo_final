import { cn } from '@zproo/ui';
import { useEffect, useState, type ReactNode } from 'react';

/**
 * Artwork for the meal and baggage cards.
 *
 * Every card has built-in vector artwork (SVG). To show a real photograph instead, just save
 * `<id>.webp` (1600×1200 recommended) in `apps/web/public/assets/addons/` — for example
 * `samosa-chai.webp` or `bag-15.webp`. No code change is needed: the photo is picked up
 * automatically, and the artwork stays as the fallback for any id that has no file.
 */
export const photoUrl = (id: string) => `/assets/addons/${id}.webp`;

/** True once `<id>.webp` has actually loaded; stays false (artwork shown) if the file is missing. */
function usePhoto(id: string): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    if (typeof Image === 'undefined') return;
    const img = new Image();
    let live = true;
    img.onload = () => {
      if (live) setReady(true);
    };
    img.src = photoUrl(id);
    return () => {
      live = false;
      img.onload = null;
    };
  }, [id]);
  return ready;
}

/** Deterministic pseudo-random numbers so the artwork never changes between renders. */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return (((r ^ (r >>> 14)) >>> 0) / 4_294_967_296);
  };
}

/** Points scattered inside a circle. */
function scatter(n: number, cx: number, cy: number, radius: number, seed: number) {
  const rand = rng(seed);
  return Array.from({ length: n }, () => {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * radius;
    return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: rand(), s: rand() };
  });
}

function Scene({ label, children }: { label: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label={label}
      className="size-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="zp-art-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff7ed" />
          <stop offset="1" stopColor="#ffe4e6" />
        </linearGradient>
        <radialGradient id="zp-art-glow" cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#zp-art-bg)" />
      <circle cx="350" cy="40" r="70" fill="#d9141e" opacity="0.06" />
      <circle cx="40" cy="270" r="90" fill="#d9141e" opacity="0.05" />
      <rect width="400" height="300" fill="url(#zp-art-glow)" />
      {children}
    </svg>
  );
}

function Plate({ cx = 200, cy = 150, r = 112 }: { cx?: number; cy?: number; r?: number }) {
  return (
    <>
      <circle cx={cx + 5} cy={cy + 9} r={r} fill="#000" opacity="0.13" />
      <circle cx={cx} cy={cy} r={r} fill="#ffffff" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={r * 0.78} fill="#f8fafc" stroke="#eef0f3" strokeWidth="2" />
    </>
  );
}

function Lemon({ x, y, rot = 0 }: { x: number; y: number; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d="M-18 0a18 18 0 0 1 36 0z" fill="#fde047" stroke="#eab308" strokeWidth="2" />
      <path d="M-12 -2a12 12 0 0 1 24 0z" fill="#fef9c3" />
      <path d="M0 -2V-12M-7 -2L-9 -9M7 -2L9 -9" stroke="#fde047" strokeWidth="1.5" />
    </g>
  );
}

function Bowl({
  cx,
  cy,
  r,
  fill,
  rim = '#ffffff',
}: {
  cx: number;
  cy: number;
  r: number;
  fill: string;
  rim?: string;
}) {
  return (
    <>
      <circle cx={cx + 3} cy={cy + 5} r={r} fill="#000" opacity="0.14" />
      <circle cx={cx} cy={cy} r={r} fill={rim} stroke="#d1d5db" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r * 0.82} fill={fill} />
    </>
  );
}

function Rice({
  cx,
  cy,
  r,
  base,
  seed,
  chicken = false,
}: {
  cx: number;
  cy: number;
  r: number;
  base: string;
  seed: number;
  chicken?: boolean;
}) {
  const grains = scatter(120, cx, cy, r - 6, seed);
  const saffron = scatter(16, cx, cy, r - 14, seed + 1);
  const bits = scatter(chicken ? 7 : 14, cx, cy, r - 16, seed + 2);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={base} />
      {saffron.map((p, i) => (
        <ellipse
          key={`s${i}`}
          cx={p.x}
          cy={p.y}
          rx={9 + p.r * 9}
          ry={4 + p.s * 5}
          transform={`rotate(${p.r * 180} ${p.x} ${p.y})`}
          fill="#f59e0b"
          opacity="0.55"
        />
      ))}
      {grains.map((p, i) => (
        <ellipse
          key={`g${i}`}
          cx={p.x}
          cy={p.y}
          rx="6"
          ry="1.8"
          transform={`rotate(${p.r * 180} ${p.x} ${p.y})`}
          fill="#fffbeb"
          opacity="0.85"
        />
      ))}
      {bits.map((p, i) =>
        chicken ? (
          <rect
            key={`b${i}`}
            x={p.x - 11}
            y={p.y - 7}
            width="22"
            height="14"
            rx="6"
            transform={`rotate(${p.r * 120 - 60} ${p.x} ${p.y})`}
            fill={i % 2 ? '#a8531a' : '#92400e'}
            stroke="#78350f"
            strokeWidth="1.2"
          />
        ) : (
          <circle
            key={`b${i}`}
            cx={p.x}
            cy={p.y}
            r={i % 3 === 0 ? 5 : 3.5}
            fill={i % 3 === 0 ? '#fb923c' : i % 3 === 1 ? '#65a30d' : '#16a34a'}
          />
        ),
      )}
      {scatter(9, cx, cy - 6, r - 18, seed + 3).map((p, i) => (
        <path
          key={`m${i}`}
          d={`M${p.x} ${p.y}q6-9 12 0q-6 9-12 0z`}
          fill="#22c55e"
          transform={`rotate(${p.r * 360} ${p.x} ${p.y})`}
        />
      ))}
      {scatter(10, cx, cy - 4, r - 20, seed + 4).map((p, i) => (
        <rect
          key={`o${i}`}
          x={p.x}
          y={p.y}
          width="9"
          height="2.2"
          rx="1"
          transform={`rotate(${p.r * 180} ${p.x} ${p.y})`}
          fill="#92400e"
        />
      ))}
    </g>
  );
}

function Triangle({
  x,
  y,
  rot,
  size = 1,
  children,
}: {
  x: number;
  y: number;
  rot: number;
  size?: number;
  children?: ReactNode;
}) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${size})`}>{children}</g>
  );
}

/** One of the meal illustrations. */
function MealScene({ id, label }: { id: string; label: string }) {
  switch (id) {
    case 'veg-dum-biryani':
    case 'chicken-biryani': {
      const chicken = id === 'chicken-biryani';
      return (
        <Scene label={label}>
          <Plate />
          <Rice
            cx={190}
            cy={146}
            r={78}
            base={chicken ? '#f3d9a4' : '#f6e3b0'}
            seed={chicken ? 11 : 7}
            chicken={chicken}
          />
          <Bowl cx={314} cy={218} r={34} fill="#f1f5f9" />
          <circle cx={314} cy={218} r={22} fill="#ecfccb" />
          {scatter(10, 314, 218, 18, 5).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2" fill="#16a34a" />
          ))}
          {chicken && (
            <>
              <g>
                <ellipse cx="96" cy="222" rx="22" ry="15" fill="#ffffff" stroke="#e5e7eb" />
                <circle cx="96" cy="222" r="8" fill="#fbbf24" />
              </g>
              <path d="M255 82q18-6 30 10q-18 4-30-10z" fill="#dc2626" />
            </>
          )}
          <Lemon x={92} y={86} rot={-20} />
        </Scene>
      );
    }
    case 'dal-makhani-combo':
      return (
        <Scene label={label}>
          <rect x="48" y="52" width="304" height="200" rx="26" fill="#000" opacity="0.1" />
          <rect x="44" y="46" width="304" height="200" rx="26" fill="#ffffff" stroke="#e5e7eb" strokeWidth="3" />
          <Bowl cx={135} cy={146} r={66} fill="#6b2410" />
          <path
            d="M96 140q22-26 44-4t38-6q-6 34-40 38t-42-28z"
            fill="#fff7ed"
            opacity="0.85"
          />
          <path d="M104 150q26 18 52-4" fill="none" stroke="#f5d0a9" strokeWidth="4" strokeLinecap="round" />
          {scatter(14, 135, 146, 40, 21).map((p, i) => (
            <ellipse key={i} cx={p.x} cy={p.y} rx="3.2" ry="1.6" fill="#16a34a" transform={`rotate(${p.r * 180} ${p.x} ${p.y})`} />
          ))}
          <circle cx="265" cy="150" r="58" fill="#f1f5f9" />
          <circle cx="265" cy="146" r="50" fill="#fffdf5" />
          {scatter(60, 265, 146, 46, 33).map((p, i) => (
            <ellipse key={i} cx={p.x} cy={p.y} rx="5.5" ry="1.6" fill={i % 5 === 0 ? '#a16207' : '#f5f0dc'} transform={`rotate(${p.r * 180} ${p.x} ${p.y})`} />
          ))}
          <Lemon x={312} y={86} rot={25} />
          <circle cx="300" cy="206" r="7" fill="#fca5a5" />
          <circle cx="216" cy="102" r="6" fill="#fca5a5" />
        </Scene>
      );
    case 'paneer-tikka-wrap':
      return (
        <Scene label={label}>
          <rect x="44" y="46" width="312" height="208" rx="26" fill="#000" opacity="0.1" />
          <rect x="40" y="40" width="312" height="208" rx="26" fill="#ffffff" stroke="#e5e7eb" strokeWidth="3" />
          <g transform="rotate(-16 200 150)">
            <rect x="92" y="108" width="216" height="76" rx="38" fill="#c4a574" />
            <rect x="92" y="108" width="132" height="76" rx="38" fill="#e8c28a" />
            <rect x="92" y="108" width="132" height="76" rx="38" fill="#d6a95f" opacity="0.4" />
            {[110, 134, 158].map((x) => (
              <path key={x} d={`M${x} 114l22 64`} stroke="#a16207" strokeWidth="3" opacity="0.35" strokeLinecap="round" />
            ))}
            <ellipse cx="308" cy="146" rx="22" ry="38" fill="#fff3d6" stroke="#d6a95f" strokeWidth="3" />
            <ellipse cx="308" cy="146" rx="15" ry="30" fill="#fed7aa" />
            <rect x="300" y="124" width="14" height="14" rx="3" fill="#f97316" />
            <rect x="302" y="146" width="12" height="12" rx="3" fill="#fb923c" />
            <path d="M298 132q10-10 18 0t-10 10z" fill="#22c55e" />
            <path d="M296 160q12 8 20-2" fill="none" stroke="#a3e635" strokeWidth="5" strokeLinecap="round" />
            <path d="M216 108l-4 76" stroke="#d1d5db" strokeWidth="2" />
            <path d="M92 118q-30 6-34 30t34 36z" fill="#cbd5e1" />
            <path d="M92 124q-22 6-24 22t24 30z" fill="#e2e8f0" />
          </g>
          <Bowl cx={96} cy={206} r={28} fill="#bbf7d0" />
          <Lemon x={316} y={206} rot={-10} />
          {scatter(6, 96, 206, 14, 2).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="2" fill="#16a34a" />
          ))}
        </Scene>
      );
    case 'chicken-club-sandwich':
      return (
        <Scene label={label}>
          <Plate />
          {[
            { x: 160, y: 140, rot: -8 },
            { x: 228, y: 164, rot: 14 },
          ].map((t, i) => (
            <Triangle key={i} x={t.x} y={t.y} rot={t.rot}>
              <path d="M-70 52L0 -62L70 52z" fill="#e7c48f" stroke="#b9873d" strokeWidth="4" strokeLinejoin="round" />
              <path d="M-58 36L0 -50L58 36z" fill="#f5deb0" />
              <path d="M-60 42q10-12 20 0t20 0t20 0t20 0t20 0v8h-100z" fill="#4ade80" />
              <path d="M-56 52h112v-6h-112z" fill="#fde68a" />
              <path d="M-50 58h100v-8h-100z" fill="#c2763a" />
              <path d="M-46 64h92v-6h-92z" fill="#ef4444" />
              <path d="M-72 70L0 -64L72 70z" fill="none" stroke="#b9873d" strokeWidth="5" strokeLinejoin="round" />
            </Triangle>
          ))}
          <path d="M214 90l10-34" stroke="#92400e" strokeWidth="3" strokeLinecap="round" />
          <path d="M224 56l18 4-14 10z" fill="#dc2626" />
          {scatter(7, 300, 214, 28, 3).map((p, i) => (
            <path key={i} d={`M${p.x} ${p.y}l16 4l-8 14z`} fill="#fcd34d" stroke="#f59e0b" strokeWidth="1.5" transform={`rotate(${p.r * 360} ${p.x} ${p.y})`} />
          ))}
        </Scene>
      );
    case 'masala-omelette':
      return (
        <Scene label={label}>
          <Plate />
          <path d="M104 164a92 78 0 0 1 184 0q-92 36-184 0z" fill="#fcd34d" stroke="#f59e0b" strokeWidth="4" strokeLinejoin="round" />
          <path d="M112 160a84 70 0 0 1 168 0" fill="none" stroke="#fde68a" strokeWidth="6" strokeLinecap="round" />
          <path d="M104 164q92 36 184 0" fill="none" stroke="#d97706" strokeWidth="5" opacity="0.5" />
          {scatter(26, 196, 140, 62, 9).map((p, i) => (
            <circle key={i} cx={p.x} cy={Math.min(p.y, 168)} r={2 + p.s * 2.4} fill={i % 3 === 0 ? '#dc2626' : i % 3 === 1 ? '#16a34a' : '#fb923c'} />
          ))}
          {[0, 1].map((i) => (
            <g key={i} transform={`translate(${96 + i * 22} ${214 + i * 6}) rotate(${-10 + i * 8})`}>
              <rect width="58" height="46" rx="8" fill="#e8c28a" stroke="#c4893a" strokeWidth="3" />
              <rect x="6" y="6" width="46" height="34" rx="5" fill="#f9e2b4" />
            </g>
          ))}
          <rect x="262" y="206" width="48" height="26" rx="12" fill="#f59e0b" stroke="#b45309" strokeWidth="3" transform="rotate(-8 286 219)" />
          <rect x="294" y="190" width="40" height="22" rx="10" fill="#fbbf24" stroke="#b45309" strokeWidth="3" transform="rotate(14 314 201)" />
          <circle cx="330" cy="236" r="9" fill="#dc2626" />
        </Scene>
      );
    case 'fresh-fruit-bowl':
      return (
        <Scene label={label}>
          <circle cx="205" cy="160" r="112" fill="#000" opacity="0.13" />
          <circle cx="200" cy="150" r="112" fill="#ffffff" stroke="#e5e7eb" strokeWidth="3" />
          <circle cx="200" cy="150" r="90" fill="#f1f5f9" />
          {scatter(7, 200, 150, 62, 4).map((p, i) => (
            <g key={`w${i}`} transform={`rotate(${p.r * 90} ${p.x} ${p.y})`}>
              <rect x={p.x - 14} y={p.y - 14} width="28" height="28" rx="6" fill="#f43f5e" stroke="#e11d48" strokeWidth="2" />
              <circle cx={p.x - 4} cy={p.y - 3} r="1.8" fill="#4c0519" />
              <circle cx={p.x + 5} cy={p.y + 4} r="1.8" fill="#4c0519" />
            </g>
          ))}
          {scatter(6, 200, 150, 60, 14).map((p, i) => (
            <rect key={`m${i}`} x={p.x - 12} y={p.y - 12} width="24" height="24" rx="6" fill="#fdba74" stroke="#fb923c" strokeWidth="2" transform={`rotate(${p.r * 90} ${p.x} ${p.y})`} />
          ))}
          {scatter(5, 200, 150, 58, 24).map((p, i) => (
            <g key={`k${i}`}>
              <circle cx={p.x} cy={p.y} r="16" fill="#84cc16" stroke="#4d7c0f" strokeWidth="2" />
              <circle cx={p.x} cy={p.y} r="7" fill="#ecfccb" />
              {[0, 1, 2, 3, 4, 5].map((k) => (
                <circle key={k} cx={p.x + Math.cos(k) * 10} cy={p.y + Math.sin(k) * 10} r="1.3" fill="#1a2e05" />
              ))}
            </g>
          ))}
          {scatter(9, 262, 112, 22, 6).map((p, i) => (
            <circle key={`g${i}`} cx={p.x} cy={p.y} r="8" fill="#7c3aed" stroke="#5b21b6" strokeWidth="1.5" />
          ))}
          {scatter(4, 160, 190, 16, 8).map((p, i) => (
            <path key={`l${i}`} d={`M${p.x} ${p.y}q8-12 16 0q-8 12-16 0z`} fill="#22c55e" transform={`rotate(${p.r * 360} ${p.x} ${p.y})`} />
          ))}
        </Scene>
      );
    case 'samosa-chai':
      return (
        <Scene label={label}>
          <Plate cx={170} cy={150} r={108} />
          {[
            { x: 140, y: 150, rot: -14 },
            { x: 206, y: 164, rot: 16 },
          ].map((t, i) => (
            <Triangle key={i} x={t.x} y={t.y} rot={t.rot}>
              <path d="M-56 42L0 -52L56 42z" fill="#d97706" stroke="#92400e" strokeWidth="4" strokeLinejoin="round" />
              <path d="M-44 32L0 -38L44 32z" fill="#f59e0b" />
              {scatter(18, 0, 6, 30, 40 + i).map((p, k) => (
                <circle key={k} cx={p.x} cy={p.y} r={1.5 + p.s * 2} fill="#b45309" opacity="0.7" />
              ))}
              <path d="M-50 40l6-4l6 4l6-4l6 4l6-4l6 4l6-4l6 4l6-4l6 4l6-4l6 4" fill="none" stroke="#92400e" strokeWidth="2" />
            </Triangle>
          ))}
          <Bowl cx={96} cy={226} r={26} fill="#4ade80" />
          <Bowl cx={150} cy={232} r={22} fill="#92400e" />
          <ellipse cx="320" cy="168" rx="64" ry="62" fill="#000" opacity="0.12" />
          <circle cx="316" cy="160" r="62" fill="#ffffff" stroke="#e5e7eb" strokeWidth="3" />
          <circle cx="316" cy="160" r="40" fill="#ffffff" stroke="#d1d5db" strokeWidth="3" />
          <circle cx="316" cy="160" r="33" fill="#b45309" />
          <path d="M296 152q16-14 32 0t-6 20q-18 6-26-20z" fill="#d6a064" opacity="0.65" />
          <rect x="350" y="152" width="26" height="14" rx="7" fill="none" stroke="#d1d5db" strokeWidth="4" />
        </Scene>
      );
    default:
      return (
        <Scene label={label}>
          <Plate />
        </Scene>
      );
  }
}

/** A photograph when one has been added, otherwise the vector artwork. */
export function MealImage({
  id,
  label,
  className,
}: {
  id: string;
  label: string;
  className?: string;
}) {
  const photo = usePhoto(id);
  return (
    <div className={cn('relative size-full overflow-hidden bg-primary-light', className)}>
      <MealScene id={id} label={label} />
      {photo && (
        <img
          src={photoUrl(id)}
          alt=""
          aria-hidden
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </div>
  );
}

/** Suitcase that grows with the weight allowance. */
function BaggageScene({ kg, label }: { kg: number; label: string }) {
  const scale = 0.8 + (Math.min(kg, 30) / 30) * 0.45;
  const w = 130 * scale;
  const h = 150 * scale;
  const x = 200 - w / 2;
  const y = 232 - h;
  return (
    <Scene label={label}>
      <ellipse cx="200" cy="240" rx={w * 0.7} ry="11" fill="#000" opacity="0.14" />
      {kg >= 20 && (
        <g opacity="0.95">
          <rect x="58" y="146" width="62" height="86" rx="12" fill="#fca5a5" />
          <rect x="70" y="128" width="38" height="22" rx="8" fill="none" stroke="#475569" strokeWidth="6" />
          <rect x="70" y="170" width="38" height="8" rx="4" fill="#fecaca" />
        </g>
      )}
      <rect
        x={200 - w * 0.2}
        y={y - 26 * scale}
        width={w * 0.4}
        height={32 * scale}
        rx={10 * scale}
        fill="none"
        stroke="#475569"
        strokeWidth={7 * scale}
      />
      <rect x={x} y={y} width={w} height={h} rx={20 * scale} fill="#d9141e" />
      <rect x={x} y={y} width={w} height={h} rx={20 * scale} fill="url(#zp-bag-shine)" />
      <defs>
        <linearGradient id="zp-bag-shine" x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      {[0.2, 0.4, 0.6, 0.8].map((f) => (
        <rect key={f} x={x + w * f - 4 * scale} y={y + 14 * scale} width={8 * scale} height={h - 28 * scale} rx={4 * scale} fill="#000" opacity="0.14" />
      ))}
      <rect x={x + 10 * scale} y={y + h * 0.46} width={w - 20 * scale} height={10 * scale} rx={5 * scale} fill="#fecaca" opacity="0.9" />
      <circle cx={200} cy={y + h * 0.62} r={20 * scale} fill="#ffffff" />
      <text
        x="200"
        y={y + h * 0.62 + 5 * scale}
        textAnchor="middle"
        fontSize={15 * scale}
        fontWeight="800"
        fill="#b80f18"
        fontFamily="system-ui, sans-serif"
      >
        {kg}kg
      </text>
      <circle cx={x + 22 * scale} cy={232 + 8 * scale} r={9 * scale} fill="#334155" />
      <circle cx={x + w - 22 * scale} cy={232 + 8 * scale} r={9 * scale} fill="#334155" />
      <rect x={x + 6 * scale} y={y + h * 0.18} width={22 * scale} height={16 * scale} rx={4 * scale} fill="#ffffff" opacity="0.85" />
    </Scene>
  );
}

export function BaggageImage({
  id,
  kg,
  label,
  className,
}: {
  id: string;
  kg: number;
  label: string;
  className?: string;
}) {
  const photo = usePhoto(id);
  return (
    <div className={cn('relative size-full overflow-hidden bg-primary-light', className)}>
      <BaggageScene kg={kg} label={label} />
      {photo && (
        <img
          src={photoUrl(id)}
          alt=""
          aria-hidden
          decoding="async"
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </div>
  );
}
