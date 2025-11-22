import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ThemeSwitch from '@/components/custom/ThemeSwitch';

export default function AuthLayout() {
  return (
    <div className="relative flex items-center justify-center w-full min-h-screen p-4 overflow-hidden bg-background">
      {/* Background Decor */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 w-full h-full -translate-x-1/2 opacity-50 left-1/2 max-w-7xl">
          <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-accent/5 blur-[100px]" />
        </div>
      </div>

      <div className="w-full max-w-6xl">
        <header className="absolute z-20 flex items-center gap-4 top-6 left-6 md:top-10 md:left-10">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 transition-colors border rounded-full text-muted-foreground hover:text-foreground bg-background/50 border-border/50 backdrop-blur-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
          <ThemeSwitch
            variant="outline"
            className="rounded-full bg-background/50 border-border/50 backdrop-blur-sm"
          />
        </header>

        <main className="w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
