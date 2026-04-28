import Link from "next/link";

export default function FounderNav() {
  const items = [
    { href: "/founder", label: "Overview" },
    { href: "/founder/users", label: "Users" },
    { href: "/founder/profiles", label: "Marshal profiles" },
    { href: "/founder/shifts", label: "Shifts" },
    { href: "/founder/applications", label: "Applications" },
    { href: "/founder/support", label: "Support" },
  ];
  return (
    <nav className="mb-4 flex flex-wrap gap-2 border-b border-line pb-3 text-sm">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className="rounded-md border border-line bg-white px-3 py-1.5 text-ink-muted hover:bg-surface-subtle hover:text-ink"
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
