import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Anton, Manrope } from "next/font/google";
import { TS_LOGO } from "@/lib/constants";
import { getLastSources, getLastUpdated } from "@/lib/portal";
import { AppShell } from "@/components/AppShell";
import { Footer } from "@/components/Footer";
import "./globals.css";
import "./portal.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin", "latin-ext"],
  variable: "--font-anton",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "FIRTINA61 — Trabzonspor Taraftar Portalı",
  description:
    "Canlı skor, gerçek puan durumu, fikstür ve yayıncı kanal, haber ve transfer akışı, A Takım kadrosu ve resmi sosyal medya — yalnızca canlı sunucu verileriyle.",
  keywords: ["Trabzonspor", "canlı skor", "puan durumu", "fikstür", "kadro", "Süper Lig"],
  icons: { icon: TS_LOGO },
};

export const viewport: Viewport = {
  themeColor: "#070b14",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  const initialUpdatedAt = getLastUpdated();
  const initialSources = getLastSources();
  return (
    <html lang="tr" className={`${anton.variable} ${manrope.variable}`}>
      <body className="noise bg-ink-950 text-bone antialiased">
        <AppShell initialUpdatedAt={initialUpdatedAt} initialSources={initialSources} footer={<Footer />}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
