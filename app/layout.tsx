import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getSiteUrl } from "@/lib/site-url";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "One Piece TCG Shelf",
    template: "%s · One Piece TCG Shelf",
  },
  description:
    "Catalog your One Piece TCG collection, showcase graded slabs and prized cards, and share a premium public profile.",
  applicationName: "One Piece TCG Shelf",
  alternates: { canonical: "/" },
  category: "collectibles",
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
    url: "/",
    siteName: "One Piece TCG Shelf",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "One Piece TCG Shelf collection and storefront",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "One Piece TCG Shelf",
    description:
      "Catalog your collection, showcase your top cards, and share a premium public shelf.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  themeColor: "#07090d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <a
          href="#main-content"
          className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-zinc-950 transition focus:translate-y-0"
        >
          Skip to content
        </a>
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
        <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
