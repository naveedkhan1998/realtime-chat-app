import { Outlet, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare, Menu, X, Github } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#workflow' },
  { label: 'Tech Stack', href: '#stack' },
];

export default function PublicLayout() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-background selection:bg-primary/20 selection:text-primary">
      <DecorativeBackground />

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-in-out',
          isScrolled ? 'py-4' : 'py-6'
        )}
      >
        <div className="container mx-auto px-4">
          <div
            className={cn(
              'mx-auto flex items-center justify-between rounded-full border transition-all duration-300',
              isScrolled
                ? 'bg-background/70 border-border/40 shadow-lg shadow-primary/5 backdrop-blur-xl py-3 px-5 max-w-5xl'
                : 'bg-transparent border-transparent py-2 px-2 max-w-7xl'
            )}
          >
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 transition-transform duration-300 group-hover:scale-105 group-hover:shadow-primary/30">
                <MessageSquare className="h-5 w-5" />
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                MNK<span className="text-primary">Chat</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground hover:text-foreground"
              >
                <a
                  href="https://github.com/naveedkhan1998/realtime-chat-app"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Github className="mr-2 h-4 w-4" />
                  GitHub
                </a>
              </Button>
              <div className="h-6 w-px bg-border/50" />
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="rounded-full font-medium"
              >
                <Link to="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="rounded-full px-5 shadow-md shadow-primary/20"
              >
                <Link to="/login">Get Started</Link>
              </Button>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full"
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <main className="relative pt-32 pb-20">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

function MobileMenu({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-xs border-l border-border bg-card p-6 shadow-2xl md:hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <span className="text-lg font-bold">Menu</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-4">
              {navItems.map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className="text-lg font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  {item.label}
                </a>
              ))}
              <hr className="border-border my-2" />
              <Button
                asChild
                variant="outline"
                className="w-full justify-start rounded-xl"
              >
                <Link to="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                className="w-full justify-start rounded-xl shadow-lg shadow-primary/20"
              >
                <Link to="/login">Get Started</Link>
              </Button>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DecorativeBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[100px] animate-pulse" />
      <div className="absolute top-[20%] right-[-5%] h-[400px] w-[400px] rounded-full bg-accent/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[20%] h-[600px] w-[600px] rounded-full bg-primary/5 blur-[100px]" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <MessageSquare className="h-4 w-4" />
            </div>
            <span className="font-semibold text-sm">MNK Chat</span>
          </div>
          <p className="text-sm text-muted-foreground text-center md:text-right">
            © {new Date().getFullYear()} Naveed Khan. Built for learning.
          </p>
        </div>
      </div>
    </footer>
  );
}
