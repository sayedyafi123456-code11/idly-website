import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "IDLY — Your Code. Your Details.",
  description: "A consent-first profile community with smart AI assistance."
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}