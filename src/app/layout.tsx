import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  variable: "--font-bricolage",
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "FullnesInfo", template: "%s · FullnesInfo" },
  description: "Tu biblioteca de aprendizaje, tu hábito diario y sus consecuencias.",
  applicationName: "FullnesInfo",
  appleWebApp: { capable: true, title: "Fullnes", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0f" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-MX" className={display.variable}>
      <body>{children}</body>
    </html>
  );
}
