import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arnold Sprint",
  description: "Multi-jurisdiction sprint race tracker — dino edition 🦖",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
