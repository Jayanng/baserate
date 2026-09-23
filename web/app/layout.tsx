import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BaseRate",
  description: "Pre-trade stress desk for Bitget rToken weekend trades",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="br-canvas">{children}</body>
    </html>
  );
}
