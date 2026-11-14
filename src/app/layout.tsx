import type { Metadata } from "next";
import { Titillium_Web, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const titilliumWeb = Titillium_Web({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  variable: "--font-titillium",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lunar Landing Site Navigator | Mission HUD",
  description:
    "A dark, horizon-first workspace for comparing lunar south-pole sites.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${titilliumWeb.variable} ${jetbrainsMono.variable}`}>
      <body className="h-full w-full overflow-hidden bg-black font-sans text-foreground antialiased selection:bg-[#00e5ff] selection:text-black">
        {children}
      </body>
    </html>
  );
}
