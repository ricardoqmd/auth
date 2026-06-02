import type { Metadata } from "next";
import { Providers } from "./providers";
import { SiteNav } from "@/components/site-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "@ricardoqmd/auth — demo",
  description: "Reference app for the @ricardoqmd auth packages",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SiteNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
