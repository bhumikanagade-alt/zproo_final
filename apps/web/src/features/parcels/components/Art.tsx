import { useReducedMotion } from './motion';

interface AnimProps {
  off: boolean;
  attributeName: string;
  dur: string;
  repeatCount: string;
  values?: string;
  from?: string;
  to?: string;
  begin?: string;
}
/** SMIL <animate> that renders nothing when the visitor prefers reduced motion. */
const An = ({ off, ...p }: AnimProps) => (off ? null : <animate {...p} />);

/** Hero illustration: a delivery truck driving past a skyline (decorative). */
function Skyline({ blocks, fill }: { blocks: number[][]; fill: number }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${i * 230} 0)`}>
          {blocks.map((b, k) => (
            <rect key={k} x={b[0]} y={232 - b[2]!} width={b[1]} height={b[2]} rx={3} fill="#fff" fillOpacity={fill} />
          ))}
        </g>
      ))}
    </>
  );
}

const FAR = [[0, 40, 70], [48, 30, 110], [86, 46, 86], [140, 34, 126], [182, 40, 80]];
const NEAR = [[10, 34, 44], [60, 50, 60], [124, 30, 38], [170, 44, 56]];
const BOXES = [[330, 150, 16], [390, 190, 12], [60, 130, 12]] as const;

export function ParcelArt({ from, to }: { from: string; to: string }) {
  const rm = useReducedMotion();
  const label = `${from} → ${to}`;
  return (
    <svg className="art" viewBox="0 0 460 300" role="img" aria-label={`A delivery truck driving from ${from} to ${to}`}>
      <defs><clipPath id="pcl-cl"><rect width={460} height={300} rx={28} /></clipPath></defs>
      <rect width={460} height={300} rx={28} fill="#fff" fillOpacity={0.13} stroke="#fff" strokeOpacity={0.3} />
      <g clipPath="url(#pcl-cl)">
        <circle cx={372} cy={76} r={34} fill="#fff" fillOpacity={0.38}><An off={rm} attributeName="r" values="34;39;34" dur="4s" repeatCount="indefinite" /></circle>
        <ellipse cx={110} cy={70} rx={36} ry={9} fill="#fff" fillOpacity={0.4}><An off={rm} attributeName="cx" values="110;160;110" dur="10s" repeatCount="indefinite" /></ellipse>
        <ellipse cx={300} cy={120} rx={26} ry={7} fill="#fff" fillOpacity={0.3}><An off={rm} attributeName="cx" values="300;260;300" dur="12s" repeatCount="indefinite" /></ellipse>
        <g>
          {!rm && <animateTransform attributeName="transform" type="translate" from="0 0" to="-230 0" dur="16s" repeatCount="indefinite" />}
          <Skyline blocks={FAR} fill={0.16} />
        </g>
        <g>
          {!rm && <animateTransform attributeName="transform" type="translate" from="0 0" to="-230 0" dur="7s" repeatCount="indefinite" />}
          <Skyline blocks={NEAR} fill={0.28} />
        </g>
        <rect y={232} width={460} height={68} fill="#fff" fillOpacity={0.24} />
        <line x1={0} x2={460} y1={268} y2={268} stroke="#fff" strokeWidth={3} strokeDasharray="22 18" strokeLinecap="round">
          <An off={rm} attributeName="stroke-dashoffset" from="0" to="-40" dur=".6s" repeatCount="indefinite" />
        </line>
        <g stroke="#fff" strokeWidth={3} strokeLinecap="round">
          {[[110, 196, 60], [100, 208, 70], [116, 220, 50]].map((l, i) => (
            <line key={i} x1={l[0]! - l[2]!} x2={l[0]} y1={l[1]} y2={l[1]}>
              <An off={rm} attributeName="opacity" values="0;.8;0" dur=".9s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
            </line>
          ))}
        </g>
        <g transform="translate(130 178)">
          {!rm && <animateTransform attributeName="transform" type="translate" values="130 178;130 176;130 178" dur=".5s" repeatCount="indefinite" />}
          <rect width={100} height={54} rx={9} fill="#fff" />
          <rect y={40} width={100} height={14} rx={4} fill="#e31118" />
          <text x={50} y={26} textAnchor="middle" fill="#e31118" fontWeight={700} fontSize={15}>zproo go</text>
          <path d="M104 16h24l16 18v20h-40z" fill="#ffe3e3" />
          <path d="M110 22h15l10 12h-25z" fill="#e31118" fillOpacity={0.4} />
          {[24, 118].map((x) => (
            <g key={x} transform={`translate(${x} 58)`}>
              <g>
                {!rm && <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur=".5s" repeatCount="indefinite" />}
                <circle r={11} fill="#b30d13" stroke="#fff" strokeWidth={3} />
                <path d="M-8 0H8M0 -8V8" stroke="#fff" strokeWidth={2} />
              </g>
            </g>
          ))}
        </g>
        {BOXES.map((b, i) => (
          <g key={i} transform={`translate(${b[0]} ${b[1]})`}>
            {!rm && <animateTransform attributeName="transform" type="translate" values={`${b[0]} ${b[1]};${b[0]} ${b[1] - 10};${b[0]} ${b[1]}`} dur={`${3 + i}s`} repeatCount="indefinite" />}
            <rect x={-b[2]} y={-b[2]} width={b[2] * 2} height={b[2] * 2} rx={4} fill="#fff" />
            <path d={`M${-b[2]} -2H${b[2]}M0 ${-b[2]}V${b[2]}`} stroke="#e31118" strokeWidth={2.5} />
          </g>
        ))}
      </g>
      <rect x={20} y={18} width={60 + (from.length + to.length) * 8} height={32} rx={16} fill="#fff" />
      <text x={36} y={39} fill="#b30d13" fontWeight={600} fontSize={13}>{label}</text>
    </svg>
  );
}

/** Small animated route line used on the summary page. */
export function RouteViz() {
  const rm = useReducedMotion();
  return (
    <svg viewBox="0 0 400 54" width="100%" height={54} style={{ margin: '6px 0 12px' }} aria-hidden="true">
      <path id="pcl-rvp" d="M14 36Q200 -14 386 36" fill="none" stroke="#e31118" strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round">
        {!rm && <animate attributeName="stroke-dashoffset" from="22" to="0" dur="1.1s" repeatCount="indefinite" />}
      </path>
      <circle cx={14} cy={36} r={7} fill="#e31118" />
      <circle cx={386} cy={36} r={7} fill="#fff" stroke="#e31118" strokeWidth={3} />
      <g>
        {!rm && <animateMotion dur="3.2s" repeatCount="indefinite"><mpath href="#pcl-rvp" /></animateMotion>}
        <rect x={-9} y={-8} width={18} height={16} rx={4} fill="#e31118" />
        <path d="M-9 -1H9M0 -8V8" stroke="#fff" strokeWidth={2} />
      </g>
    </svg>
  );
}

/** Truck marker riding on the tracking bar. */
export function TruckMark() {
  return (
    <svg width={34} height={24} viewBox="0 0 34 24" fill="currentColor" aria-hidden="true">
      <rect x={0} y={3} width={20} height={14} rx={3} />
      <path d="M21 7h6l5 5v5H21z" />
      <circle cx={7} cy={19} r={3.2} stroke="#fff" strokeWidth={1.5} />
      <circle cx={25} cy={19} r={3.2} stroke="#fff" strokeWidth={1.5} />
    </svg>
  );
}

/** Animated tick for the confirmation page. */
export function CheckMark() {
  return (
    <svg className="chk" viewBox="0 0 64 64" width={76} height={76} aria-hidden="true">
      <circle className="ring" cx={32} cy={32} r={29} fill="none" stroke="#16813d" strokeWidth={4} transform="rotate(-90 32 32)" />
      <path className="tick" d="M19 33l9 9 17-19" fill="none" stroke="#16813d" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
