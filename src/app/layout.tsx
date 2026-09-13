import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { ConvexClientProvider } from "./providers";
import "./globals.css";

// §21.2 Display face — headlines only, never body
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// §21.2 Interface/body face — UI and long-form body, never headlines
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://the-huma-edit.vercel.app",
  ),
  title: {
    default: "The Human Edit — By humans. For humans.",
    template: "%s — The Human Edit",
  },
  description:
    "Stories, ideas, language, perspectives, and useful things worth reading. By humans, for humans.",
  openGraph: {
    siteName: "The Human Edit",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

// Apply theme before first paint to prevent a flash of the wrong theme.
const themeBootstrap = `(function () {
  try {
    var stored = localStorage.getItem("hume-theme") || "auto";
    var sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", stored === "auto" ? sys : stored);
    document.documentElement.setAttribute("data-theme-mode", stored);
  } catch (e) {}
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
