import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "One Piece TCG Shelf",
    template: "%s · One Piece TCG Shelf",
  },
  description:
    "Browse One Piece cards, track your collection, and share a public shelf with collectors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50">
        {/* Shared SVG filter for card art sharpening */}
        <svg
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 overflow-hidden"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="card-sharpen" colorInterpolationFilters="sRGB">
              <feConvolveMatrix
                order="3"
                kernelMatrix="0 -0.35 0 -0.35 2.4 -0.35 0 -0.35 0"
                preserveAlpha="true"
              />
            </filter>
          </defs>
        </svg>
        <SiteHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
