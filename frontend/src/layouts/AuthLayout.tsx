import { Outlet, Link } from "react-router-dom";
import { MessageSquare, ArrowLeft } from "lucide-react";

export default function AuthLayout() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Background Decor */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl opacity-50">
          <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-accent/5 blur-[100px]" />
        </div>
      </div>

      <div className="w-full max-w-6xl">
        <header className="absolute top-6 left-6 md:top-10 md:left-10 z-20">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors rounded-full bg-background/50 px-4 py-2 border border-border/50 backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
        </header>

        <main className="w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
