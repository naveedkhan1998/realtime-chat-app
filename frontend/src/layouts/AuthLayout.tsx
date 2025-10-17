import { Outlet, Link } from "react-router-dom";
import { MessageSquare } from "lucide-react";

export default function AuthLayout() {
  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-primary/15 via-background to-accent/15">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-10 top-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-accent/25 blur-[140px]" />
      </div>
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-8">
        <Link to="/" className="flex items-center gap-3 text-lg font-semibold text-primary">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30">
            <MessageSquare className="h-5 w-5" />
          </span>
          MNK Chat
        </Link>
        <Link to="/" className="text-sm font-medium text-muted-foreground transition hover:text-primary">
          Back to site
        </Link>
      </header>
      <main className="mx-auto flex w-full flex-1 items-center justify-center px-4 pb-12 pt-4">
        <div className="relative w-full max-w-5xl rounded-3xl border border-white/30 bg-white/70 p-6 shadow-2xl shadow-primary/20 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/80">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
