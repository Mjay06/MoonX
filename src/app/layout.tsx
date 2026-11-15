import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" className="dark">
      <body className="h-full w-full overflow-hidden bg-black font-sans text-foreground antialiased selection:bg-[#00e5ff] selection:text-black">
        {children}
      </body>
    </html>
  );
}
