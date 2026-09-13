import type { Metadata } from "next";
import { Geist, Geist_Mono, Newsreader } from "next/font/google";
import { ConvexClientProvider } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// §21.2 Editorial display face — headlines, pull quotes
const newsreader = Newsreader({
  variable: "--font-display-face",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

// §21.2 Reading face — long-form body text
const readingFace = Newsreader({
  variable: "--font-reading-face",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "The Human Edit — BY HUMANS. FOR HUMANS.",
    template: "%s — The Human Edit",
  },
  description:
    "Stories, ideas, language, perspectives, and useful things worth reading. By humans, for humans.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} ${readingFace.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
