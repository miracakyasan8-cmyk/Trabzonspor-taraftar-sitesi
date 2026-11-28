"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarClock,
  CheckCheck,
  Home,
  ListOrdered,
  Menu,
  Newspaper,
  Share2,
  ShoppingBag,
  Users,
  X,
} from "lucide-react";
import { TS_LOGO } from "@/lib/constants";
import { TeamLogo } from "./TeamLogo";

export const TABS = [
  { href: "/", label: "Ana Sayfa", icon: Home },
  { href: "/haberler", label: "Haberler & Transfer", icon: Newspaper },
  { href: "/oynanmis", label: "Oynanmış", icon: CheckCheck },
  { href: "/oynanacak", label: "Oynanacak", icon: CalendarClock },
  { href: "/puan-durumu", label: "Puan Durumu", icon: ListOrdered },
  { href: "/kadro", label: "Kadro", icon: Users },
  { href: "/sosyal", label: "Sosyal", icon: Share2 },
  { href: "/ts-store", label: "TS Store", icon: ShoppingBag },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-ink-900/95 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 sm:gap-3">
          <TeamLogo src={TS_LOGO} name="Trabzonspor" size={38} />
          <div className="leading-none">
            <span className="font-display text-lg tracking-wide text-bone">
              FIRTINA<span className="text-mavi">61</span>
            </span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.32em] text-muted">
              Taraftar Portalı
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-0.5 xl:flex">
          {TABS.map((t) => {
            const on = active(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={on ? "page" : undefined}
                title={t.label}
                className={`whitespace-nowrap rounded-full px-2.5 py-2 text-[11px] font-bold transition-all 2xl:px-3 2xl:text-[12px] ${
                  on
                    ? "bg-gradient-to-r from-bordo to-bordo-400 text-white shadow-[0_6px_20px_-8px_rgba(138,21,56,0.9)]"
                    : "text-muted hover:bg-white/5 hover:text-bone"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => setOpen(!open)}
            className="rounded-lg border border-white/10 p-2 text-bone xl:hidden"
            aria-label="Menü"
            aria-expanded={open}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open ? (
        <div className="border-t border-white/5 bg-ink-900/95 backdrop-blur-md xl:hidden">
          <div className="flex flex-col px-4 py-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const on = active(t.href);
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  onClick={() => setOpen(false)}
                  aria-current={on ? "page" : undefined}
                  className={`flex items-center gap-3 border-b border-white/5 py-3 text-sm font-bold last:border-0 ${
                    on ? "text-mavi" : "text-bone"
                  }`}
                >
                  <Icon size={16} className={on ? "text-mavi" : "text-muted"} />
                  {t.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}
