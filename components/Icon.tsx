import type { ReactNode } from "react";

const icons = {
  home: <><path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-7h6v7"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
  pin: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  pound: <><circle cx="12" cy="12" r="9"/><path d="M14.5 8.5a2.1 2.1 0 0 0-4 1v4a3 3 0 0 1-.8 2.5h5M8.8 12.5h4.4"/></>,
  person: <><circle cx="12" cy="8" r="3.5"/><path d="M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2"/></>,
  people: <><path d="M15 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M21 21v-2a4 4 0 0 0-3-4M16 4a4 4 0 0 1 0 8"/><circle cx="9" cy="8" r="4"/></>,
  clipboard: <><rect x="5" y="5" width="14" height="16" rx="2"/><rect x="9" y="3" width="6" height="4" rx="1" fill="white"/><path d="M9 12h6m-6 4h6"/></>,
  check: <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
  shield: <path d="m12 3 8 3v5c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z"/>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 9h18c0-1-3-2-3-9M10 21h4"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  back: <path d="M20 12H5m6-6-6 6 6 6"/>,
  chevron: <path d="m9 6 6 6-6 6"/>,
  menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof icons;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name]}
    </svg>
  );
}
