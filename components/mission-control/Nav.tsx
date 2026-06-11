"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/morning-scan", label: "Morning Scan" },
  { href: "/client-tracker", label: "Client Tracker" },
];

export function MissionControlNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap items-center gap-1 mb-6 text-sm">
      <span className="mono text-[11px] font-bold tracking-[.2em] mr-3 neon">
        KINGSGATE · MISSION CONTROL
      </span>
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`navtab ${pathname === t.href ? "active" : ""}`}
        >
          {t.label}
        </Link>
      ))}
      <span className="navtab faint" style={{ cursor: "default" }} title="Roadmap">
        Money
      </span>
    </nav>
  );
}
