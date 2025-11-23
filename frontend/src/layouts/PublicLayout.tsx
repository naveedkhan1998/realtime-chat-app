import { Outlet, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Github } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeSwitch from '@/components/custom/ThemeSwitch';
import { BackgroundBlobs } from '@/components/ui/background-blobs';

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
    <div className="relative w-full min-h-screen overflow-x-hidden bg-background/80 selection:bg-primary/60 selection:text-primary">
      <BackgroundBlobs />

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-in-out',
          isScrolled ? 'py-4' : 'py-6'
        )}
      >
        <div className="container px-4 mx-auto">
          <div
            className={cn(
              'mx-auto flex items-center justify-between rounded-full border transition-all duration-300',
              isScrolled
                ? 'bg-background/70 border-border/40 shadow-lg shadow-primary/5 backdrop-blur-xl py-3 px-5 max-w-5xl'
                : 'bg-transparent border-transparent py-2 px-2 max-w-7xl'
            )}
          >
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="relative flex items-center justify-center w-10 h-10 overflow-hidden transition-transform duration-300 shadow-lg rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-primary/20 group-hover:scale-105 group-hover:shadow-primary/30">
                <img
                  src="/apple-touch-icon.png"
                  alt="Logo"
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 transition-opacity opacity-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent group-hover:opacity-100" />
              </div>
              <span className="text-lg font-bold tracking-tight text-foreground">
                MNK<span className="text-primary">Chat</span>
              </span>
            </Link>

            <nav className="items-center hidden gap-1 md:flex">
              {navItems.map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-4 py-2 text-sm font-medium transition-colors rounded-full text-muted-foreground hover:bg-primary/5 hover:text-primary"
                >
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="items-center hidden gap-3 md:flex">
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
                  <Github className="w-4 h-4 mr-2" />
                  GitHub
                </a>
              </Button>
              <div className="w-px h-6 bg-border/50" />
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="font-medium rounded-full"
              >
                <Link to="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                size="sm"
                className="px-5 rounded-full shadow-md shadow-primary/20"
              >
                <Link to="/login">Get Started</Link>
              </Button>
              <ThemeSwitch
                variant="ghost"
                size="icon"
                className="rounded-full"
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full md:hidden"
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
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
            className="fixed inset-y-0 right-0 z-50 w-full max-w-xs p-6 border-l shadow-2xl border-border bg-card md:hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <span className="text-lg font-bold">Menu</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex flex-col gap-4">
              {navItems.map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={onClose}
                  className="text-lg font-medium transition-colors text-muted-foreground hover:text-primary"
                >
                  {item.label}
                </a>
              ))}
              <hr className="my-2 border-border" />
              <Button
                asChild
                variant="outline"
                className="justify-start w-full rounded-xl"
              >
                <Link to="/login">Sign in</Link>
              </Button>
              <Button
                asChild
                className="justify-start w-full shadow-lg rounded-xl shadow-primary/20"
              >
                <Link to="/login">Get Started</Link>
              </Button>
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <span className="text-sm font-medium text-muted-foreground">
                  Theme
                </span>
                <ThemeSwitch variant="outline" size="sm" showLabel={false} />
              </div>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/50 backdrop-blur-sm">
      <div className="container px-4 py-12 mx-auto">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 overflow-hidden rounded-lg bg-primary/10 text-primary">
              <img
                src="/apple-touch-icon.png"
                alt="Logo"
                className="object-cover w-full h-full"
              />
            </div>
            <span className="text-sm font-semibold">MNK Chat</span>
          </div>
          <p className="text-sm text-center text-muted-foreground md:text-right">
            © {new Date().getFullYear()} Naveed Khan. Built for learning.
          </p>
        </div>
      </div>
    </footer>
  );
}
