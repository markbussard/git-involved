"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { Github, Menu, X } from "lucide-react";

import { ThemeToggle } from "~/components/layout/theme-toggle";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        navRef.current &&
        !navRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        close();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, close]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, close]);

  return (
    <div className="md:hidden">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-9 w-9 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {isOpen ? (
        <div
          ref={navRef}
          className="border-border bg-background/95 animate-in fade-in slide-in-from-top-2 absolute top-full right-0 left-0 z-50 border-b backdrop-blur-md duration-200"
        >
          <nav className="flex flex-col gap-1 px-4 py-3">
            <Link
              href="https://github.com/markbussard/git-involved"
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="text-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
            >
              <Github className="h-4 w-4" />
              GitHub
            </Link>
            <div className="flex items-center gap-2 px-3 py-2">
              <span className="text-muted-foreground text-sm">Theme</span>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
