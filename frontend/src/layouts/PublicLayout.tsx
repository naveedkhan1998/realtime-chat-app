import { Outlet, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Menu } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#features" },
  { label: "Security", href: "#security" },
  { label: "Pricing", href: "#pricing" },
];

export default function PublicLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <DecorativeBackdrop />
      <header className="fixed inset-x-0 top-0 z-30">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between rounded-full border border-white/40 bg-white/60 px-6 py-3 shadow-lg shadow-primary/10 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/70">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-white">
              <MessageSquare className="h-5 w-5" />
            </span>
            <span>MNK Chat</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className="rounded-full px-4 py-2 text-sm text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="hidden text-sm font-medium md:inline-flex">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild className="text-sm font-semibold">
              <Link to="/login">Launch App</Link>
            </Button>
            <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setIsMenuOpen((prev) => !prev)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div
          className={cn(
            "mx-auto mt-3 w-full max-w-6xl overflow-hidden rounded-3xl border border-white/30 bg-white/70 px-6 py-4 shadow-lg shadow-primary/10 backdrop-blur-md transition-all md:hidden dark:border-white/10 dark:bg-slate-900/80",
            isMenuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className="rounded-2xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-primary">
                {item.label}
              </a>
            ))}
            <Button asChild className="mt-2 w-full">
              <Link to="/login">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-28 md:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

function DecorativeBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-accent/30 blur-[140px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/60 to-white dark:via-slate-950/30 dark:to-slate-950" />
    </div>
  );
}
