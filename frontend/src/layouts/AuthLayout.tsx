import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ThemeSwitch from '@/components/custom/ThemeSwitch';

export default function AuthLayout() {
  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col justify-between bg-background text-foreground p-4 sm:p-6 md:p-8">
      {/* Top Header Strip */}
      <header className="flex items-center justify-between w-full max-w-6xl mx-auto z-20">
        <Link
          to="/"
          className="key font-mono text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>ESC / BACK</span>
        </Link>

        <ThemeSwitch variant="ghost" size="sm" showLabel={false} />
      </header>

      {/* Main Container */}
      <div className="relative z-10 flex w-full max-w-5xl mx-auto items-center justify-center py-6 sm:py-8 my-auto">
        <main className="w-full">
          <Outlet />
        </main>
      </div>

      {/* Subtle Hardware Baseline */}
      <footer className="w-full max-w-6xl mx-auto flex items-center justify-between text-2xs font-mono text-muted-foreground/60 pt-4 border-t border-border/50">
        <div>TERMINAL AUTHENTICATION GATEWAY &middot; TLS 1.3</div>
        <div>MODEL RT-2</div>
      </footer>
    </div>
  );
}
