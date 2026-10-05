'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/profile', label: 'Profile' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/resumes', label: 'Resumes' },
  { href: '/cover-letters', label: 'Cover letters' },
  { href: '/settings', label: 'Settings' },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex flex-wrap gap-1 text-sm">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-full px-3 py-1.5 ${active ? 'bg-sky-50 font-semibold text-brand dark:bg-sky-950 dark:text-sky-300' : 'muted hover:text-brand'}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
