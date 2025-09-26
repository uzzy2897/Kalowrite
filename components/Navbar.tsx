"use client";

import { UserButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { LogIn, Menu, X } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";

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
  const [isOpen, setIsOpen] = useState(false);

  if (!isLoaded) return null;

  if (pathname === "/humanize-ai") return null;

  const handleTryForFree = () => {
    if (isSignedIn) {
      router.push("/humanize-ai");
    } else {
      router.push("/auth/sign-in?redirect_url=/humanize-ai");
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-stone-950">
      <nav className="flex items-center max-w-7xl mx-auto justify-between px-6 py-4">
        {/* Logo */}
        <Link href={"/"}>
          <img
            className="h-8"
            src="https://geteasycal.com/wp-content/uploads/2025/09/kalowrite-logo.png"
            alt="Kalowrite Logo"
          />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex gap-4 items-center">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium hover:underline"
            >
              {link.label}
            </Link>
          ))}

          <SignedOut>
            <button
              className="bg-emerald-500 text-sm font-semibold rounded-md hover:bg-emerald-400 px-4 py-2 transition ease-in"
              onClick={handleTryForFree}
            >
              Try for Free
            </button>
            <Link
              href={"/auth/sign-in"}
              className="border bg-primary hidden lg:flex text-neutral-950 px-4 py-2 text-sm font-semibold rounded-md items-center hover:bg-primary/70 transition ease-in"
            >
              Login <LogIn className="h-4 ml-1" />
            </Link>
          </SignedOut>

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

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-md hover:bg-neutral-800 transition"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-neutral-950 border-t border-neutral-800 px-6 py-4 flex flex-col gap-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium hover:underline"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          <SignedOut >
            <div className="flex w-full gap-2">
            <button
              className="bg-emerald-500 text-sm w-full  font-semibold rounded-md hover:bg-emerald-400 px-4 py-2 transition ease-in"
              onClick={() => {
                handleTryForFree();
                setIsOpen(false);
              }}
            >
              Try for Free
            </button>
            <Link
              href={"/auth/sign-in"}
              className="border bg-primary text-neutral-950 w-full flex  justify-center px-4 py-2 text-sm font-semibold rounded-md items-center hover:bg-primary/70 transition ease-in"
              onClick={() => setIsOpen(false)}
            >
              Login <LogIn className="h-4 ml-1" />
            </Link>

            </div>
         
          </SignedOut>

          <SignedIn>
            <div className="flex gap-2 w-full">
            <Link
              href={"/humanize-ai"}
              className="border bg-accent px-4 py-2 w-full text-sm font-semibold rounded-full"
              onClick={() => setIsOpen(false)}
            >
              ✨ Start Humanizing
            </Link>
            <Link
              href={"/pricing"}
              className="px-4 py-2 border text-sm w-full font-semibold bg-emerald-500 rounded-full"
              onClick={() => setIsOpen(false)}
            >
              Upgrade plan
            </Link>

            </div>
           
        
          </SignedIn>
        </div>
      )}
    </header>
  );
}
