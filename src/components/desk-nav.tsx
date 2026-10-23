"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const links = [
  { href: "/", label: "Queue" },
  { href: "/voices", label: "Voices" },
  { href: "/metrics", label: "Metrics" },
  { href: "/tests", label: "Test pack" },
  { href: "/limits", label: "Limits" },
];

export function DeskNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-1">
      {links.map((link) => {
        const active = link.href === "/" ? path === "/" : path.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-md px-2.5 py-1 text-sm",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
