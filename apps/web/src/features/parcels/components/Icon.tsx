/** Static SVG path data (constants only — never user input). */
const PATHS = {
  box: '<path d="M3 8l9-5 9 5v8l-9 5-9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>',
  truck: '<path d="M2 6h11v9H2zM13 9h4l3 3v3h-7z"/><circle cx="6" cy="17" r="1.8"/><circle cx="17" cy="17" r="1.8"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  wallet: '<path d="M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 7l12-3v3"/><circle cx="17" cy="13.5" r="1"/>',
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>',
  pin: '<path d="M12 21s7-6 7-11a7 7 0 00-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  shirt: '<path d="M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 01-8 0z"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  glass: '<path d="M7 3h10l-1 7a4 4 0 01-8 0z"/><path d="M12 14v6M8 21h8"/>',
  food: '<path d="M4 11h16a8 8 0 01-16 0zM9 7c0-2 2-2 2-4M14 7c0-2 2-2 2-4"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName | string }) {
  const d = PATHS[name as IconName] ?? PATHS.box;
  return (
    <span className="ic">
      <svg
        width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: d }}
      />
    </span>
  );
}
