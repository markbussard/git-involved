import Link from "next/link";

import { Github } from "lucide-react";

import { MobileNav } from "~/components/layout/mobile-nav";
import { ThemeToggle } from "~/components/layout/theme-toggle";

export function Header() {
  return (
    <header className="border-border bg-background/80 relative sticky top-0 z-50 w-full border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Logo / Brand */}
        <Link
          href="/"
          className="text-foreground hover:text-primary text-lg font-bold tracking-tight transition-colors"
        >
          Git-Involved
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="https://github.com/markbussard/git-involved"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors"
          >
            <Github className="h-4 w-4" />
            GitHub
          </Link>
          <ThemeToggle />
        </nav>

        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </header>
  );
}
