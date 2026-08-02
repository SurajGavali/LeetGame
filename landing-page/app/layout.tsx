import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    title: "LeetGame — Play the problem. Code the pattern.",
    description:
      "LeetGame turns real-world missions into playable algorithm lessons: win first, reveal the strategy, then carry it into code.",
    metadataBase,
    openGraph: {
      title: "LeetGame — Play the problem. Code the pattern.",
      description:
        "Play a real mission, reveal the algorithm you discovered, and carry the pattern into code.",
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "LeetGame — Play the problem. Code the pattern.",
      description:
        "Play a real mission, reveal the algorithm you discovered, and carry the pattern into code.",
      images: ["/og.png"],
    },
    icons: {
      icon: "/leetgame-symbol.svg?v=2",
      shortcut: "/leetgame-symbol.svg?v=2",
      apple: "/leetgame-symbol.svg?v=2",
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
