import type { Metadata } from "next";
import Link from "next/link";
import { SearchForm } from "@/components/SearchForm";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Context", template: "%s · Context" },
  description: "Quick, sourced context for any Bible verse: who, what, when, where and why.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link href="/" className="logo">
            Context
          </Link>
          <SearchForm />
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          Scripture from the King James Version, Berean Standard Bible and American Standard Version, all public
          domain.
        </footer>
      </body>
    </html>
  );
}
