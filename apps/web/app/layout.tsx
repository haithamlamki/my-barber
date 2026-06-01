import type { ReactNode } from "react";
import "./globals.css";

/**
 * Root layout intentionally does NOT render <html> / <body>. The locale layout at
 * app/[locale]/layout.tsx renders them with the correct lang + dir attributes.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
