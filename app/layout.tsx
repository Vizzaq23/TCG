import type { Metadata, Viewport } from "next";
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
    "Catalog your One Piece TCG collection, showcase graded slabs and prized cards, and share a premium public profile.",
  applicationName: "One Piece TCG Shelf",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TCG Shelf",
  },
  openGraph: {
    title: "One Piece TCG Shelf",
    description:
      "Catalog. Showcase. Share. Track cards, grades, trades, and portfolio value — then present your favorites in a lit glass case.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "One Piece TCG Shelf",
    description:
      "Catalog your collection, showcase your top cards, and share a premium public shelf.",
  },
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
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
      <body className="flex min-h-full flex-col bg-background text-foreground">
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
