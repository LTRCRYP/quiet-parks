import type { Metadata } from "next";
import { Jersey_25, DotGothic16 } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { visitationVintage } from "@/lib/parks";
import { PixelIcon, PixelScene } from "@/components/pixel/Pixel";
import { SPRITES } from "@/lib/pixel-art";

const jersey = Jersey_25({ variable: "--font-jersey", subsets: ["latin"], weight: "400" });
const dot = DotGothic16({ variable: "--font-dot", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { default: "Quiet Parks", template: "%s · Quiet Parks" },
  description: "America's least-crowded national parks, what to do there, and when to go.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jersey.variable} ${dot.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <header>
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2">
              <PixelIcon rows={SPRITES.pine} scale={2} />
              <span className="pixel text-3xl leading-none">Quiet Parks</span>
            </Link>
            <div className="pixel flex gap-5 text-xl text-ink-2">
              <Link href="/" className="hover:text-ink">Ranking</Link>
              <Link href="/near" className="hover:text-ink">Near me</Link>
              <Link href="/about" className="hover:text-ink">Method</Link>
            </div>
          </nav>
          <div className="mx-auto max-w-6xl px-4 sm:px-6"><div className="px-rule" /></div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-16">
          <PixelScene biome="forest" scale={2} />
          <div className="mx-auto max-w-6xl px-4 py-8 text-xs leading-relaxed text-ink-3 sm:px-6">
            <p>{visitationVintage}. Park details, photos and alerts from the NPS API. Climate from Open-Meteo (ERA5). Nearby public lands from Recreation.gov RIDB. Map © OpenStreetMap contributors.</p>
            <p className="mt-1">Visitation counts are visits, not unique visitors, as reported by each park. The Crowd Index is relative among the ranked NPS units, not an absolute measure.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
