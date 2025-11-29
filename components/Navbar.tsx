"use client";

import { SignedIn, SignedOut, useUser, SignOutButton } from "@clerk/nextjs";
import { LogIn, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const { isSignedIn, isLoaded, user } = useUser();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [plan, setPlan] = useState<string>("free");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user");
        if (!res.ok) return;
        const data = await res.json();
        setPlan(data.plan ?? "free");
      } catch (err) {
        console.error("❌ Navbar user fetch error:", err);
      }
    };
    if (isSignedIn) fetchUser();
  }, [isSignedIn]);

  if (pathname === "/humanize-ai") return null;
  if (!isLoaded) return <NavbarSkeleton />;

  return (
    <header className="sticky top-0 z-50 border-b bg-stone-950">
      <nav className="flex items-center max-w-7xl mx-auto justify-between px-6 py-4">
        {/* Logo */}
        <Link href={"/"}>
          <img
            className="h-6"
            src="/kalowrite-logo.png"
            alt="Kalowrite Logo"
          />
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex gap-4 items-center relative">
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
            <Link
              href={"/auth/sign-in"}
              className="border bg-primary hidden lg:flex text-neutral-950 px-4 py-2 text-sm font-semibold rounded-md items-center hover:bg-primary/70 transition ease-in"
            >
              Login <LogIn className="h-4 ml-1" />
            </Link>
          </SignedOut>

          <SignedIn>
            <Link
              href={"/humanize"}
              className="border bg-accent px-4 text-xs py-2 flex justify-center font-semibold rounded-md"
            >
              ✨ Start Humanizing
            </Link>

            {/* Avatar dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="h-8 w-8 rounded-full overflow-hidden flex items-center justify-center border border-neutral-700"
              >
                <img
                  src={user?.imageUrl || "https://placehold.co/32x32"}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="absolute right-0 mt-2 w-64 bg-card border rounded-xl shadow-md text-sm z-50 overflow-hidden"
                  >
                    {/* Header with avatar, name, plan */}
                    <div className="p-2 flex items-center gap-3 bg-accent">
                      <img
                        src={user?.imageUrl || "https://placehold.co/32x32"}
                        alt="Avatar"
                        className="h-10 w-10 rounded-full object-cover border"
                      />
                      <div className="flex gap-2 w-full items-center justify-between">
                        <p className="font-medium">{user?.fullName || "User"}</p>
                        <p className="text-xs bg-emerald-500 w-fit text-black py-1 px-3 rounded-full capitalize">
                          {plan}
                        </p>
                      </div>
                    </div>

                    {/* Links */}
                    <Link
                      href="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="block px-3 py-2 mt-2 text-center border-b hover:bg-muted"
                    >
                      My Profile
                    </Link>

                    {/* 💎 Show this only for pro or ultra plans */}
                    {(plan === "pro" || plan === "ultra") && (
                      <Link
                        href="/topup"
                        onClick={() => setIsDropdownOpen(false)}
                        className="block px-3 py-2 text-center text-white border font-semibold bg-card hover:bg-primary/20 transition rounded-md mx-3 my-2"
                      >
                        Get more words
                      </Link>
                    )}

                    <SignOutButton>
                      <button className="w-full px-3 text-center py-2 text-destructive hover:bg-muted">
                        Sign Out
                      </button>
                    </SignOutButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </SignedIn>
        </div>

        {/* Mobile Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-md hover:bg-neutral-800 transition"
          >
            {isSidebarOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <img
                src="https://kolowrite.vercel.app/ri_menu-2-fill.svg"
                className="h-6 w-6"
              />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            {/* Dark overlay */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed top-0 left-0 h-full w-64 bg-stone-950 z-50 flex flex-col justify-between border-r border-neutral-800"
            >
              <div className="p-6 space-y-6">
                <SignedIn>
                  <div className="flex items-center gap-3">
                    <img
                      src={user?.imageUrl || "https://placehold.co/40"}
                      alt="Avatar"
                      className="h-10 w-10 rounded-full border"
                    />
                    <div>
                      <p className="font-medium text-white">
                        {user?.fullName || "User"}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        Plan: {plan}
                      </p>
                    </div>
                  </div>
                </SignedIn>

                <div className="flex flex-col gap-4">
                  <SignedIn>
                    <Link
                      href="/profile"
                      onClick={() => setIsSidebarOpen(false)}
                      className="font-medium hover:underline"
                    >
                      My Profile
                    </Link>

                    {/* 💎 Show Top-up button in mobile too */}
                    {(plan === "pro" || plan === "ultra") && (
                      <Link
                        href="/topup"
                        onClick={() => setIsSidebarOpen(false)}
                        className="border bg-card text-white text-sm font-semibold rounded-md py-2 px-4 text-center hover:bg-primary/20 transition"
                      >
                        Get more words
                      </Link>
                    )}
                  </SignedIn>

                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="font-medium hover:underline"
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ))}

                  <SignedIn>
                    <Link
                      href={"/humanize"}
                      onClick={() => setIsSidebarOpen(false)}
                      className="border bg-accent px-4 py-2 w-full text-sm flex justify-center font-semibold rounded-md"
                    >
                      ✨ Start Humanizing
                    </Link>
                  </SignedIn>

                  <SignedOut>
                    <Link
                      href={"/auth/sign-in"}
                      onClick={() => setIsSidebarOpen(false)}
                      className="border bg-primary text-neutral-950 px-4 py-2 text-sm font-semibold rounded-md flex justify-center"
                    >
                      Login
                    </Link>
                  </SignedOut>
                </div>
              </div>

              <SignedIn>
                <div className="p-6 border-t border-neutral-800">
                  <SignOutButton>
                    <button className="w-full text-left text-red-500 border border-red-500 rounded px-3 py-2 hover:bg-red-500/10">
                      Sign Out
                    </button>
                  </SignOutButton>
                </div>
              </SignedIn>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

function NavbarSkeleton() {
  return (
    <header className="sticky top-0 z-50 border-b bg-stone-950">
      <nav className="flex items-center max-w-7xl mx-auto justify-between px-6 py-4 animate-pulse">
        <div className="h-6 w-28 bg-gray-700 rounded-md" />
        <div className="hidden md:flex gap-4 items-center">
          <div className="h-4 w-16 bg-gray-700 rounded-md" />
          <div className="h-4 w-16 bg-gray-700 rounded-md" />
          <div className="h-4 w-16 bg-gray-700 rounded-md" />
          <div className="h-4 w-16 bg-gray-700 rounded-md" />
          <div className="h-8 w-20 bg-gray-700 rounded-md" />
        </div>
      </nav>
    </header>
  );
}
