"use client";

import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  if (!isLoaded) return null;

  // Don't render navbar on /humanize-ai
  if (pathname === "/humanize-ai") {
    return null;
  }

  const handleTryForFree = () => {
    if (isSignedIn) {
      router.push("/humanize-ai");
    } else {
      router.push("/auth/sign-in?redirect_url=/humanize-ai");
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-neutral-950">
      <nav className="flex items-center max-w-7xl mx-auto justify-between px-6 py-4">
        {/* Logo */}
        <Link href={"/"}>
          <img
            className="h-8"
            src="https://geteasycal.com/wp-content/uploads/2025/09/kalowrite-logo.png"
            alt="Kalowrite Logo"
          />
        </Link>

        <div className="flex items-center gap-4">
          {/* Desktop Links */}
          <div className="hidden md:flex gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-medium hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Signed Out */}
          <SignedOut>
            <button
              className="bg-emerald-500 text-sm font-semibold rounded-md hover:bg-emerald-700 px-4 py-2"
              onClick={handleTryForFree}
            >
              Try for Free
            </button>
          </SignedOut>

          {/* Signed In */}
          <SignedIn>
            <Link
              href={"/humanize-ai"}
              className="border bg-accent px-4 py-2 text-sm font-semibold rounded-full"
            >
              ✨ Start Humanizing
            </Link>
            <Link
              href={"/pricing"}
              className="px-4 py-2 border text-sm font-semibold bg-emerald-500 rounded-full"
            >
              Upgrade plan
            </Link>
            <UserButton />
          </SignedIn>
        </div>
      </nav>

      {/* Mobile bar */}
      <div className="md:hidden fixed bottom-0 left-0 w-full flex justify-around border-t bg-neutral-950 px-4 py-2 z-50">
        <SignedOut>
          <button
            className="bg-emerald-500 text-xs font-semibold rounded-md px-3 py-2"
            onClick={handleTryForFree}
          >
            Try for Free
          </button>
        </SignedOut>

        <SignedIn>
          <Link
            href={"/humanize-ai"}
            className="bg-accent text-xs font-semibold rounded-md px-3 py-2"
          >
            ✨ Humanize
          </Link>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  );
}
