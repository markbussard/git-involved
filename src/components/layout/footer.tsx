import Link from "next/link";
import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 sm:px-6">
        {/* Credits */}
        <p className="text-center text-sm text-muted-foreground">
          Built with{" "}
          <FooterLink href="https://nextjs.org">Next.js</FooterLink>,{" "}
          <FooterLink href="https://ui.shadcn.com">ShadCN UI</FooterLink>, and{" "}
          <FooterLink href="https://www.pinecone.io">Pinecone</FooterLink>
        </p>

        {/* Links */}
        <nav className="flex items-center gap-4">
          <Link
            href="https://github.com/markbussard/git-involved"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="h-4 w-4" />
            GitHub
          </Link>
        </nav>

        {/* Copyright */}
        <p className="text-xs text-muted-foreground/70">
          &copy; 2025 Git-Involved
        </p>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-foreground underline-offset-4 transition-colors hover:underline"
    >
      {children}
    </a>
  );
}
