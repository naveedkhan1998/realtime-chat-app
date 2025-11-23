import { Outlet, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BackgroundBlobs } from '@/components/ui/background-blobs';

export default function AuthLayout() {
  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center bg-background/80 p-4 md:p-8">
      <BackgroundBlobs />

      <header className="absolute left-4 top-4 z-50 md:left-8 md:top-8">
        <Link
          to="/"
          className="group flex items-center gap-2 rounded-full border border-white/10 bg-background/50 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur-md transition-all hover:bg-background/80 hover:text-foreground hover:pr-5"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back</span>
        </Link>
      </header>

      <div className="relative z-10 flex w-full max-w-6xl items-center justify-center py-12 md:py-0">
        <main className="w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
