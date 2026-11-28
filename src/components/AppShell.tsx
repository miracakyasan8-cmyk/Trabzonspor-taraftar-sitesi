"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { RefreshBar } from "./RefreshBar";
import { StaleNotice } from "./StaleNotice";
import type { SyncSource } from "@/lib/types";

/** Ana sayfa yalnızca ekranı doldurur. Diğer sekmeler kendi içerikleri ve footer ile kayar. */
export function AppShell({ children, footer, initialUpdatedAt, initialSources }: {
  children: ReactNode;
  footer: ReactNode;
  initialUpdatedAt: string | null;
  initialSources: SyncSource[];
}) {
  const home = usePathname() === "/";

  return (
    <div className={`site-shell${home ? " site-shell--home" : ""}`}>
      <Navbar />
      <div className="site-shell__spacer" />
      <RefreshBar initialUpdatedAt={initialUpdatedAt} />
      {!home ? <StaleNotice sources={initialSources} /> : null}
      <main id="main-content" className="site-shell__main">{children}</main>
      {!home ? footer : null}
    </div>
  );
}
