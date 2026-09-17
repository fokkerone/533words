import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Inter is a variable font on Google Fonts, so leaving `weight` unspecified
// loads its full variable weight axis (100–900) rather than a fixed subset.
// That range covers everything the design needs: a very heavy weight (900)
// for the hero word, and regular/medium weights (400/500) for body/UI text.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "533words",
  description: "NRW Lernwort-Karteikarten",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
