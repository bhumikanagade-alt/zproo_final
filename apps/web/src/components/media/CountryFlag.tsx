import { useState } from 'react';

/**
 * Country flag as an image. Flag emoji do not render on Windows (they show as letters such as
 * "IN"), so flags are loaded from flagcdn.com; if the image cannot load, the ISO code is shown.
 */
export function CountryFlag({ code, className = '' }: { code: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const lower = code.toLowerCase();
  if (failed) {
    return (
      <span
        aria-hidden
        className={`inline-grid h-4 w-6 shrink-0 place-items-center rounded-[3px] bg-border text-[9px] font-bold ${className}`}
      >
        {code}
      </span>
    );
  }
  return (
    <img
      src={`https://flagcdn.com/w40/${lower}.png`}
      srcSet={`https://flagcdn.com/w80/${lower}.png 2x`}
      width={24}
      height={16}
      alt=""
      aria-hidden
      loading="lazy"
      onError={() => setFailed(true)}
      className={`h-4 w-6 shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.12)] ${className}`}
    />
  );
}
