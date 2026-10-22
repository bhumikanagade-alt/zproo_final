import { cn } from '@zproo/ui';
import {
  Bike,
  Bus,
  CarTaxiFront,
  Hotel,
  Package,
  Plane,
  TrainFront,
  TreePalm,
  type LucideIcon,
} from 'lucide-react';
import { useId, type ReactNode } from 'react';

/**
 * Illustrated stand-ins for photo slots that have no published photo yet. Deliberately
 * illustrations (not fake photos): the site stays attractive without misrepresenting a place.
 */
export type Scene =
  | 'hero'
  | 'flight'
  | 'bus'
  | 'train'
  | 'hotel'
  | 'cab'
  | 'bike'
  | 'holiday'
  | 'parcel'
  | 'beach'
  | 'city-sea'
  | 'monument'
  | 'monument-dome'
  | 'city-hills'
  | 'mountain'
  | 'lake'
  | 'backwater'
  | 'desert'
  | 'city'
  | 'skyline-desert'
  | 'resort'
  | 'palace'
  | 'lodge';

const SERVICE_SCENES: Partial<Record<Scene, { icon: LucideIcon; from: string; to: string }>> = {
  flight: { icon: Plane, from: '#0ea5e9', to: '#1d4ed8' },
  bus: { icon: Bus, from: '#f97316', to: '#d9141e' },
  train: { icon: TrainFront, from: '#22c55e', to: '#047857' },
  hotel: { icon: Hotel, from: '#a855f7', to: '#6d28d9' },
  cab: { icon: CarTaxiFront, from: '#facc15', to: '#ea580c' },
  bike: { icon: Bike, from: '#14b8a6', to: '#0f766e' },
  holiday: { icon: TreePalm, from: '#f472b6', to: '#e11d48' },
  parcel: { icon: Package, from: '#f59e0b', to: '#b45309' },
};

interface SceneArtProps {
  scene: Scene;
  /** Accessible description; pass "" for decorative use. */
  label: string;
  className?: string;
}

export function SceneArt({ scene, label, className }: SceneArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  const service = SERVICE_SCENES[scene];

  if (service) {
    const Icon = service.icon;
    return (
      <div
        {...a11y}
        className={cn('relative overflow-hidden', className)}
        style={{ backgroundImage: `linear-gradient(135deg, ${service.from}, ${service.to})` }}
      >
        <div
          aria-hidden
          className="absolute -right-10 -top-10 size-48 rounded-full border-[18px] border-white/10"
        />
        <div aria-hidden className="absolute -bottom-16 -left-8 size-56 rounded-full bg-white/10" />
        <Icon
          aria-hidden
          strokeWidth={1.4}
          className="absolute bottom-3 right-3 size-2/5 max-h-28 max-w-28 text-white/90"
        />
      </div>
    );
  }

  return (
    <svg
      {...a11y}
      viewBox="0 0 400 300"
      preserveAspectRatio="xMidYMid slice"
      className={cn('block', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {LANDSCAPES[scene]?.(uid) ?? LANDSCAPES.beach?.(uid)}
    </svg>
  );
}

// ─────────────── building blocks ───────────────

function Sky({ id, top, bottom }: { id: string; top: string; bottom: string }) {
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} />
          <stop offset="1" stopColor={bottom} />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill={`url(#${id})`} />
    </>
  );
}

const Sun = ({ x, y, r, color }: { x: number; y: number; r: number; color: string }) => (
  <>
    <circle cx={x} cy={y} r={r * 1.8} fill={color} opacity="0.18" />
    <circle cx={x} cy={y} r={r} fill={color} />
  </>
);

const Birds = ({ x, y, color = '#1f2937' }: { x: number; y: number; color?: string }) => (
  <g fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.55">
    <path d={`M${x} ${y} q6 -6 12 0 q6 -6 12 0`} />
    <path d={`M${x + 34} ${y - 12} q5 -5 10 0 q5 -5 10 0`} />
  </g>
);

const Palm = ({
  x,
  y,
  s = 1,
  color = '#14532d',
}: {
  x: number;
  y: number;
  s?: number;
  color?: string;
}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={color}>
    <path d="M0 0 C4 -40 10 -70 22 -96 L27 -94 C16 -68 10 -40 7 0 Z" />
    <path d="M24 -96 C0 -110 -28 -100 -40 -84 C-18 -94 2 -94 22 -90 Z" />
    <path d="M24 -96 C44 -114 74 -108 86 -90 C62 -100 42 -98 26 -90 Z" />
    <path d="M24 -96 C14 -124 -8 -134 -26 -128 C-4 -122 10 -112 22 -94 Z" />
    <path d="M25 -96 C40 -128 64 -134 80 -124 C58 -120 42 -110 28 -94 Z" />
    <path d="M24 -95 C20 -80 8 -64 -6 -58 C8 -72 16 -84 22 -94 Z" />
  </g>
);

const Mountains = ({ d, fill, opacity }: { d: string; fill: string; opacity?: string }) => (
  <path d={d} fill={fill} opacity={opacity} />
);

const Skyline = ({
  base,
  fill,
  towers,
}: {
  base: number;
  fill: string;
  towers: [number, number, number][];
}) => (
  <g fill={fill}>
    {towers.map(([x, w, h]) => (
      <rect key={`${x}-${h}`} x={x} y={base - h} width={w} height={h} rx="1.5" />
    ))}
    <rect x="0" y={base} width="400" height={300 - base} />
  </g>
);

const Windows = ({
  base,
  towers,
  color,
}: {
  base: number;
  towers: [number, number, number][];
  color: string;
}) => (
  <g fill={color} opacity="0.75">
    {towers.flatMap(([x, w, h]) =>
      Array.from({ length: Math.floor(h / 14) }, (_, i) =>
        i % 2 === 0 ? (
          <rect
            key={`${x}-${i}`}
            x={x + w / 2 - 2}
            y={base - h + 8 + i * 14}
            width="4"
            height="5"
          />
        ) : null,
      ),
    )}
  </g>
);

const Water = ({ y, id, top, bottom }: { y: number; id: string; top: string; bottom: string }) => (
  <>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={top} />
        <stop offset="1" stopColor={bottom} />
      </linearGradient>
    </defs>
    <rect x="0" y={y} width="400" height={300 - y} fill={`url(#${id})`} />
    <g stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round">
      <path d={`M40 ${y + 22} h40 M150 ${y + 36} h60 M270 ${y + 18} h50 M90 ${y + 58} h70`} />
    </g>
  </>
);

// ─────────────── scenes ───────────────

const skyTowers: [number, number, number][] = [
  [10, 30, 70],
  [44, 22, 110],
  [70, 34, 85],
  [108, 18, 140],
  [130, 40, 95],
  [176, 26, 125],
  [206, 36, 80],
  [246, 20, 150],
  [270, 34, 100],
  [308, 24, 130],
  [336, 38, 75],
  [378, 22, 105],
];

const LANDSCAPES: Partial<Record<Scene, (uid: string) => ReactNode>> = {
  hero: (u) => (
    <>
      <Sky id={`${u}s`} top="#1e1b4b" bottom="#f97316" />
      <Sun x={300} y={190} r={38} color="#fde68a" />
      <Mountains
        d="M0 210 L70 150 L130 190 L200 120 L270 180 L330 140 L400 190 L400 300 L0 300 Z"
        fill="#7c2d12"
      />
      <Mountains
        d="M0 230 L90 190 L160 222 L240 180 L320 220 L400 200 L400 300 L0 300 Z"
        fill="#431407"
      />
      <Water y={240} id={`${u}w`} top="#fb923c" bottom="#7c2d12" />
      <path
        d="M40 110 C120 80 220 70 330 40"
        stroke="#fff"
        strokeOpacity="0.5"
        strokeWidth="2"
        strokeDasharray="1 7"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M330 40 l14 -4 l-4 6 l10 2 l-12 4 l2 6 l-8 -6 l-10 2 z" fill="#fff" />
    </>
  ),
  beach: (u) => (
    <>
      <Sky id={`${u}s`} top="#38bdf8" bottom="#fde68a" />
      <Sun x={310} y={70} r={26} color="#fef3c7" />
      <Birds x={120} y={70} />
      <Water y={170} id={`${u}w`} top="#0ea5e9" bottom="#0369a1" />
      <path d="M0 230 C90 205 200 215 400 240 L400 300 L0 300 Z" fill="#fde68a" />
      <path d="M0 250 C120 232 240 240 400 262 L400 300 L0 300 Z" fill="#fcd34d" />
      <Palm x={60} y={262} s={1.1} />
      <Palm x={330} y={270} s={0.8} color="#166534" />
    </>
  ),
  'city-sea': (u) => (
    <>
      <Sky id={`${u}s`} top="#312e81" bottom="#fb7185" />
      <Sun x={80} y={120} r={22} color="#fecdd3" />
      <Skyline base={200} fill="#1e1b4b" towers={skyTowers} />
      <Windows base={200} towers={skyTowers} color="#fde68a" />
      <Water y={200} id={`${u}w`} top="#4338ca" bottom="#1e1b4b" />
      <path
        d="M0 214 C120 200 260 204 400 216"
        stroke="#fde68a"
        strokeWidth="3"
        strokeDasharray="2 10"
        fill="none"
      />
    </>
  ),
  city: (u) => (
    <>
      <Sky id={`${u}s`} top="#0f172a" bottom="#6366f1" />
      <circle cx="320" cy="60" r="18" fill="#e0e7ff" />
      <Skyline base={240} fill="#0b1120" towers={skyTowers.map(([x, w, h]) => [x, w, h + 20])} />
      <Windows base={240} towers={skyTowers.map(([x, w, h]) => [x, w, h + 20])} color="#a5b4fc" />
      <path d="M0 260 L400 250 L400 300 L0 300 Z" fill="#111827" />
    </>
  ),
  'city-hills': (u) => (
    <>
      <Sky id={`${u}s`} top="#7dd3fc" bottom="#fef9c3" />
      <Mountains
        d="M0 180 L60 130 L120 165 L190 110 L260 160 L330 120 L400 170 L400 300 L0 300 Z"
        fill="#65a30d"
        opacity="0.7"
      />
      <Skyline base={240} fill="#475569" towers={skyTowers.map(([x, w, h]) => [x, w, h * 0.6])} />
      <path d="M0 250 C120 238 260 244 400 252 L400 300 L0 300 Z" fill="#3f6212" />
    </>
  ),
  monument: (u) => (
    <>
      <Sky id={`${u}s`} top="#fb923c" bottom="#fde68a" />
      <Sun x={200} y={110} r={30} color="#fff7ed" />
      <g fill="#7c2d12">
        <rect x="140" y="110" width="120" height="16" />
        <rect x="150" y="96" width="100" height="16" />
        <path d="M150 126 H250 V250 H222 V170 A22 22 0 0 0 178 170 V250 H150 Z" />
      </g>
      <path d="M0 250 H400 V300 H0 Z" fill="#9a3412" />
      <g fill="#14532d">
        <circle cx="60" cy="238" r="22" />
        <circle cx="340" cy="238" r="24" />
      </g>
    </>
  ),
  'monument-dome': (u) => (
    <>
      <Sky id={`${u}s`} top="#fda4af" bottom="#fef3c7" />
      <g fill="#78350f">
        {[140, 250].map((x) => (
          <g key={x}>
            <rect x={x} y="80" width="12" height="170" />
            <circle cx={x + 6} cy="76" r="9" />
          </g>
        ))}
        <path d="M150 140 H254 V250 H226 V190 A24 24 0 0 0 178 190 V250 H150 Z" />
        <rect x="160" y="126" width="84" height="14" />
      </g>
      <path d="M0 250 H400 V300 H0 Z" fill="#92400e" />
    </>
  ),
  mountain: (u) => (
    <>
      <Sky id={`${u}s`} top="#60a5fa" bottom="#e0f2fe" />
      <Mountains
        d="M0 200 L90 90 L150 150 L220 60 L300 140 L360 100 L400 130 L400 300 L0 300 Z"
        fill="#64748b"
      />
      <path
        d="M90 90 L72 112 L90 106 L104 116 Z M220 60 L198 88 L220 80 L238 92 Z M360 100 L346 116 L360 112 L372 120 Z"
        fill="#fff"
      />
      <Mountains
        d="M0 230 L80 180 L160 220 L250 170 L330 215 L400 190 L400 300 L0 300 Z"
        fill="#166534"
      />
      <g fill="#14532d">
        {[40, 70, 300, 330, 360].map((x) => (
          <path key={x} d={`M${x} 270 l14 -40 l14 40 z`} />
        ))}
      </g>
      <path d="M0 270 H400 V300 H0 Z" fill="#14532d" />
    </>
  ),
  lake: (u) => (
    <>
      <Sky id={`${u}s`} top="#93c5fd" bottom="#f0f9ff" />
      <Mountains
        d="M0 170 L80 80 L140 130 L210 50 L290 125 L350 85 L400 120 L400 180 L0 180 Z"
        fill="#475569"
      />
      <path d="M80 80 L64 100 L80 94 L96 104 Z M210 50 L190 76 L210 68 L228 82 Z" fill="#fff" />
      <Water y={180} id={`${u}w`} top="#7dd3fc" bottom="#0c4a6e" />
      <path
        d="M0 180 L80 250 L140 210 L210 280 L290 215 L350 250 L400 220 L400 180 Z"
        fill="#475569"
        opacity="0.25"
      />
      <path d="M150 230 q40 12 80 0 l-8 10 h-64 z" fill="#7c2d12" />
    </>
  ),
  backwater: (u) => (
    <>
      <Sky id={`${u}s`} top="#86efac" bottom="#fefce8" />
      <Water y={180} id={`${u}w`} top="#22c55e" bottom="#065f46" />
      <path d="M0 180 C100 170 300 172 400 180 L400 196 C300 190 100 190 0 196 Z" fill="#14532d" />
      <Palm x={40} y={190} s={0.9} />
      <Palm x={110} y={188} s={0.7} />
      <Palm x={330} y={190} s={0.85} />
      <path d="M150 240 q60 -24 120 0 l-10 14 h-100 z" fill="#78350f" />
      <path d="M170 236 q40 -30 80 0 z" fill="#b45309" />
    </>
  ),
  desert: (u) => (
    <>
      <Sky id={`${u}s`} top="#f59e0b" bottom="#fef3c7" />
      <Sun x={90} y={80} r={28} color="#fffbeb" />
      <g fill="#92400e">
        <rect x="220" y="110" width="140" height="80" />
        {[220, 250, 280, 310, 340].map((x) => (
          <rect key={x} x={x} y="100" width="14" height="12" />
        ))}
        <rect x="260" y="80" width="40" height="40" />
        <path d="M268 80 q12 -22 24 0 z" />
      </g>
      <path
        d="M0 200 C80 170 160 190 240 180 C320 170 360 190 400 185 L400 300 L0 300 Z"
        fill="#d97706"
      />
      <path d="M0 240 C100 215 220 250 400 225 L400 300 L0 300 Z" fill="#b45309" />
    </>
  ),
  'skyline-desert': (u) => (
    <>
      <Sky id={`${u}s`} top="#0ea5e9" bottom="#fde68a" />
      <g fill="#334155">
        <path d="M196 230 L200 20 L204 230 Z" />
        <path d="M188 230 L194 90 L206 90 L212 230 Z" />
      </g>
      <Skyline
        base={230}
        fill="#475569"
        towers={[
          [40, 26, 90],
          [80, 20, 130],
          [120, 30, 70],
          [250, 24, 110],
          [290, 30, 150],
          [330, 22, 90],
        ]}
      />
      <path d="M0 240 C100 225 260 250 400 232 L400 300 L0 300 Z" fill="#f59e0b" />
    </>
  ),
  resort: (u) => (
    <>
      <Sky id={`${u}s`} top="#38bdf8" bottom="#e0f2fe" />
      <rect x="0" y="150" width="400" height="150" fill="#fef3c7" />
      <path d="M40 190 H360 V260 H40 Z" fill="#06b6d4" rx="12" />
      <path
        d="M60 210 h80 M170 230 h90 M280 214 h60"
        stroke="#fff"
        strokeOpacity="0.6"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Palm x={20} y={200} s={0.9} />
      <Palm x={340} y={196} s={0.8} />
      <g fill="#fff">
        <rect x="120" y="160" width="40" height="8" rx="4" />
        <rect x="240" y="160" width="40" height="8" rx="4" />
      </g>
    </>
  ),
  palace: (u) => (
    <>
      <Sky id={`${u}s`} top="#fb7185" bottom="#fef3c7" />
      <g fill="#fff7ed">
        <rect x="100" y="120" width="200" height="70" />
        {[110, 150, 190, 230, 270].map((x) => (
          <path key={x} d={`M${x} 190 v-30 a10 10 0 0 1 20 0 v30 z`} fill="#fdba74" />
        ))}
        <path d="M180 120 q20 -40 40 0 z" />
        <rect x="100" y="104" width="16" height="16" />
        <rect x="284" y="104" width="16" height="16" />
      </g>
      <Water y={190} id={`${u}w`} top="#f472b6" bottom="#7e22ce" />
      <rect x="100" y="192" width="200" height="30" fill="#fff7ed" opacity="0.25" />
    </>
  ),
  lodge: (u) => (
    <>
      <Sky id={`${u}s`} top="#a5b4fc" bottom="#e0e7ff" />
      <Mountains
        d="M0 190 L100 90 L170 150 L260 70 L340 150 L400 110 L400 300 L0 300 Z"
        fill="#6366f1"
        opacity="0.6"
      />
      <path
        d="M100 90 L84 110 L100 104 L116 114 Z M260 70 L240 96 L260 88 L278 100 Z"
        fill="#fff"
      />
      <g fill="#78350f">
        <path d="M150 190 L200 150 L250 190 Z" />
        <rect x="160" y="190" width="80" height="50" />
      </g>
      <rect x="192" y="210" width="16" height="30" fill="#fbbf24" />
      <path d="M0 240 H400 V300 H0 Z" fill="#f8fafc" />
    </>
  ),
};
