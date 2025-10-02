"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  // Don't render footer on /humanize-ai
  if (pathname === "/humanize-ai") {
    return null;
  }

  return (
    <footer className="w-full border-t px-4 lg:px-16 mt-24">
      {/* Footer main section */}
      <div className="container mx-auto py-8 max-w-7xl grid gap-6 md:grid-cols-3 text-sm text-muted-foreground">
        <div className="border-r pr-4">
          <img
            src="https://geteasycal.com/wp-content/uploads/2025/09/kalowrite-logo.png"
            alt="Kalowrite Logo"
            className="h-8 mb-4"
          />
          <p>AI text humanizer that makes your content more natural.</p>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-2">Links</h3>
          <ul className="space-y-1 flex gap-4">
            <li>
              <Link href="/blog" className="hover:text-primary">
                Blog
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-primary">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-primary">
                Contact
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="font-semibold text-foreground mb-2">Legal</h3>
          <ul className="space-y-1 flex gap-4">
            <li>
              <Link href="/privacy" className="hover:text-primary">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-primary">
                Terms of Service
              </Link>
              <Link
          href="/legal"
          className="underline ml-2 underline-offset-2 hover:text-primary transition-colors"
        >
          Read more
        </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Disclaimer banner */}
      <div className="bg-muted/40 text-center py-3 px-4 text-sm text-muted-foreground">
        KaloWrite is not a tool for academic dishonesty or cheating.{" "}
       
        .
      </div>

      {/* Bottom note */}
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} KaloWrite. All rights reserved.
      </div>
    </footer>
  );
}
