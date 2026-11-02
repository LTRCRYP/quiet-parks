import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { visitationVintage } from "@/lib/parks";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["opsz", "SOFT"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Quiet Parks", template: "%s · Quiet Parks" },
  description: "America's least-crowded national parks, what to do there, and when to go.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-rule">
          <nav className="mx-auto flex max-w-6xl items-baseline justify-between gap-6 px-4 py-4 sm:px-6">
            <Link href="/" className="display text-xl tracking-tight">Quiet Parks</Link>
            <div className="flex gap-5 text-sm text-ink-2">
              <Link href="/" className="hover:text-ink">Ranking</Link>
              <Link href="/near" className="hover:text-ink">Near me</Link>
              <Link href="/about" className="hover:text-ink">Method</Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-16 border-t border-rule">
          <div className="mx-auto max-w-6xl px-4 py-8 text-xs leading-relaxed text-ink-3 sm:px-6">
            <p>{visitationVintage}. Park details, photos and alerts from the NPS API. Climate from Open-Meteo (ERA5). Nearby public lands from Recreation.gov RIDB. Map © OpenStreetMap contributors.</p>
            <p className="mt-1">Visitation counts are visits, not unique visitors, as reported by each park. The Crowd Index is relative among national parks only.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
