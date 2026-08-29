import type { Metadata } from "next";
import { Geist, Geist_Mono, Rajdhani } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Technical/HUD display face for headings, nav, and labels — next/font
// self-hosts this at build time (no runtime request to Google), so it's
// still safe for the air-gapped deployment target.
const rajdhani = Rajdhani({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "WESMINCOM Tactical C2 Dashboard",
  description: "Internal command-and-control monitoring dashboard for WESMINCOM.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${rajdhani.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="hud-viewport-frame" aria-hidden="true">
          <span className="hud-corner-tl" />
          <span className="hud-corner-tr" />
          <span className="hud-corner-bl" />
          <span className="hud-corner-br" />
        </div>
        <Nav />
        <main className="w-full flex-1 px-8 py-8">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
