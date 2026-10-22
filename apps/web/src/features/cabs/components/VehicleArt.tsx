import type { VehicleId } from '../types';

function Wheel({ cx, cy, r = 13 }: { cx: number; cy: number; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#1f1a1b" />
      <g className="cab-wheel">
        <circle cx={cx} cy={cy} r={r * 0.55} fill="#c9ccd1" stroke="#8f8688" strokeWidth="1" />
        <path d={`M${cx} ${cy - r * 0.5}V${cy + r * 0.5}M${cx - r * 0.5} ${cy}H${cx + r * 0.5}`} stroke="#8f8688" strokeWidth="2" />
      </g>
      <circle cx={cx} cy={cy} r={r * 0.15} fill="#5f5759" />
    </g>
  );
}

const Shadow = () => <ellipse cx="120" cy="99" rx="92" ry="6" fill="#1f1a1b" opacity=".18" />;

function Sedan() {
  return (
    <>
      <Shadow />
      <path d="M16 80 L20 66 Q23 59 32 57 L68 53 Q84 33 110 31 L152 31 Q176 34 190 53 L214 59 Q224 63 226 74 L226 82 Q226 88 220 88 L22 88 Q16 88 16 82Z" fill="#f2f3f5" stroke="#b9bdc4" strokeWidth="1.5" />
      <path d="M86 53 Q96 38 112 36 L130 36 L130 53Z M136 36 L152 36 Q168 38 181 53 L136 53Z" fill="#8fb8e0" stroke="#5f7f9f" strokeWidth="1" />
      <path d="M22 70 H218" stroke="#d0d3d9" strokeWidth="1.5" />
      <rect x="208" y="66" width="12" height="6" rx="3" fill="#ffd34d" /><rect x="16" y="66" width="8" height="6" rx="3" fill="#e31118" />
      <rect x="100" y="64" width="14" height="3" rx="1.5" fill="#8f8688" /><rect x="152" y="64" width="14" height="3" rx="1.5" fill="#8f8688" />
      <rect x="92" y="14" width="56" height="12" rx="4" fill="#ffd34d" stroke="#a8660a" /><text x="120" y="23.5" fontSize="8" fontWeight="700" textAnchor="middle" fill="#1f1a1b">TAXI</text><rect x="110" y="26" width="20" height="5" fill="#8f8688" />
      <Wheel cx={64} cy={88} /><Wheel cx={180} cy={88} />
    </>
  );
}

function Suv() {
  return (
    <>
      <Shadow />
      <rect x="64" y="20" width="108" height="4" rx="2" fill="#1f1a1b" />
      <path d="M68 24v6M168 24v6" stroke="#1f1a1b" strokeWidth="3" />
      <path d="M14 84 L16 62 Q18 54 28 52 L50 50 L62 33 Q66 29 74 29 L172 29 Q182 29 188 37 L202 54 L218 58 Q228 62 228 72 L228 84 Q228 90 222 90 L20 90 Q14 90 14 84Z" fill="#2f4a73" stroke="#1d2f4a" strokeWidth="1.5" />
      <path d="M68 52 L78 36 L108 36 L108 52Z M114 36 L142 36 L142 52 L114 52Z M148 36 L170 36 Q178 37 183 44 L192 52 L148 52Z" fill="#a8cdee" stroke="#1d2f4a" strokeWidth="1" />
      <path d="M20 72 H224" stroke="#1d2f4a" strokeWidth="1.5" />
      <rect x="216" y="62" width="12" height="8" rx="3" fill="#ffe27a" /><rect x="14" y="62" width="8" height="8" rx="3" fill="#e31118" />
      <rect x="104" y="64" width="14" height="3" rx="1.5" fill="#c9ccd1" /><rect x="152" y="64" width="14" height="3" rx="1.5" fill="#c9ccd1" />
      <path d="M180 84 H224" stroke="#1d2f4a" strokeWidth="6" />
      <Wheel cx={62} cy={90} r={16} /><Wheel cx={184} cy={90} r={16} />
    </>
  );
}

function Mini() {
  return (
    <>
      <Shadow />
      <path d="M26 82 L30 66 Q33 59 42 57 L80 53 Q92 34 116 33 L148 33 Q170 36 182 54 L204 60 Q214 64 216 74 L216 82 Q216 88 210 88 L32 88 Q26 88 26 82Z" fill="#e31118" stroke="#b30d13" strokeWidth="1.5" />
      <path d="M92 54 Q100 40 116 38 L134 38 L134 54Z M140 38 L148 38 Q164 40 174 54 L140 54Z" fill="#cfe6fa" stroke="#7f1014" strokeWidth="1" />
      <path d="M32 72 H212" stroke="#b30d13" strokeWidth="1.5" />
      <rect x="204" y="68" width="10" height="6" rx="3" fill="#ffe27a" /><rect x="26" y="68" width="8" height="6" rx="3" fill="#fff" />
      <Wheel cx={72} cy={88} r={12} /><Wheel cx={172} cy={88} r={12} />
    </>
  );
}

function Premium() {
  return (
    <>
      <Shadow />
      <path d="M12 82 L18 68 Q22 61 34 59 L72 55 Q90 34 118 32 L150 32 Q178 35 194 55 L220 61 Q230 65 232 76 L232 83 Q232 89 226 89 L18 89 Q12 89 12 83Z" fill="#1f1a1b" stroke="#000" strokeWidth="1.5" />
      <path d="M90 55 Q102 39 120 37 L136 37 L136 55Z M142 37 L152 37 Q172 40 186 55 L142 55Z" fill="#6f8fb0" stroke="#000" strokeWidth="1" />
      <path d="M18 71 H226" stroke="#d4af37" strokeWidth="2" />
      <rect x="218" y="67" width="12" height="5" rx="2.5" fill="#fff" /><rect x="12" y="67" width="9" height="5" rx="2.5" fill="#e31118" />
      <Wheel cx={62} cy={89} r={14} /><Wheel cx={188} cy={89} r={14} />
      <circle cx="120" cy="71" r="0" />
    </>
  );
}

function Auto() {
  return (
    <>
      <Shadow />
      <path d="M62 24 L170 24 Q178 24 180 32 L186 60 L54 60 L58 32 Q59 24 62 24Z" fill="#16813d" stroke="#0e5a2a" strokeWidth="1.5" />
      <path d="M66 30 H106 V56 H62Z M112 30 H166 L170 56 H112Z" fill="#cfe6fa" opacity=".9" stroke="#0e5a2a" />
      <path d="M40 60 L200 60 Q212 60 214 72 L214 84 L36 84 L36 70 Q36 60 40 60Z" fill="#f6c21a" stroke="#b58a00" strokeWidth="1.5" />
      <rect x="202" y="68" width="10" height="7" rx="3" fill="#fff" stroke="#b58a00" /><rect x="36" y="68" width="6" height="7" rx="2" fill="#e31118" />
      <path d="M130 62v22" stroke="#b58a00" strokeWidth="1.5" />
      <Wheel cx={62} cy={86} r={12} /><Wheel cx={176} cy={86} r={12} />
    </>
  );
}

function Bike() {
  return (
    <>
      <Shadow />
      <circle cx="70" cy="80" r="18" fill="none" stroke="#1f1a1b" strokeWidth="6" /><circle cx="170" cy="80" r="18" fill="none" stroke="#1f1a1b" strokeWidth="6" />
      <circle cx="70" cy="80" r="4" fill="#8f8688" /><circle cx="170" cy="80" r="4" fill="#8f8688" />
      <path d="M70 80 L100 58 L150 58 L170 80 M100 58 L122 80 L96 80 M150 58 L158 44 L176 44" fill="none" stroke="#e31118" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="104" y="48" width="44" height="12" rx="6" fill="#b30d13" />
      <circle cx="124" cy="22" r="9" fill="#f1c8a5" /><path d="M115 20 Q124 8 133 20Z" fill="#1f1a1b" />
      <path d="M124 31 L126 50 L142 56 M124 36 L152 44" fill="none" stroke="#2f4a73" strokeWidth="7" strokeLinecap="round" />
      <rect x="168" y="38" width="12" height="6" rx="3" fill="#ffe27a" />
    </>
  );
}

const ART = { sedan: Sedan, suv: Suv, mini: Mini, premium: Premium, auto: Auto, bike: Bike } as const;

/** Clean, high-contrast vehicle illustration (SVG, no external image needed). */
export function VehicleArt({ id, className, title }: { id: VehicleId; className?: string; title?: string }) {
  const Art = ART[id];
  return (
    <svg viewBox="0 0 240 110" role="img" aria-label={title ?? `${id} vehicle`} className={className}>
      <Art />
    </svg>
  );
}
