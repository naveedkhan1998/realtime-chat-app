import { Outlet, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X, Github, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeSwitch from '@/components/custom/ThemeSwitch';
import { BrandMark } from '@/components/console/BrandMark';

const navItems = [
  { label: '01/FEATURES', href: '#features' },
  { label: '02/ARCHITECTURE', href: '#architecture' },
  { label: '03/DATASHEET', href: '#datasheet' },
  { label: '04/QUICKSTART', href: '#quickstart' },
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
    <div className="relative w-full min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Top Console Bar */}
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-all duration-200 border-b',
          isScrolled
            ? 'bg-card/95 border-border shadow-panel backdrop-blur-md py-2.5'
            : 'bg-card/80 border-border/80 backdrop-blur-sm py-3.5'
        )}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo / Brandmark */}
          <Link to="/" className="flex items-center group">
            <BrandMark size={32} wordmark />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="items-center hidden md:flex gap-1">
            {navItems.map(item => (
              <a
                key={item.label}
                href={item.href}
                className="px-3 py-1.5 font-mono text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right Action Cluster */}
          <div className="items-center hidden md:flex gap-2.5">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="font-mono text-xs text-muted-foreground hover:text-foreground h-8 px-2.5 gap-1.5"
            >
              <a
                href="https://github.com/naveedkhan1998/realtime-chat-app"
                target="_blank"
                rel="noreferrer"
              >
                <Github className="size-3.5" />
                SOURCE
              </a>
            </Button>

            <ThemeSwitch variant="outline" size="sm" showLabel={false} />

            <div className="w-px h-5 bg-border mx-0.5" />

            <Button
              asChild
              size="sm"
              className="font-mono text-xs font-bold h-8 px-3.5"
            >
              <Link to="/login">OPEN CONSOLE</Link>
            </Button>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex items-center gap-2 md:hidden">
            <ThemeSwitch variant="ghost" size="icon" showLabel={false} />
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open navigation menu"
            >
              <Menu className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Main Content Stage */}
      <main className="relative pt-20 sm:pt-24 pb-16">
        <Outlet />
      </main>

      {/* Backplate Device Footer */}
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
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-xs p-5 border-l border-border bg-card shadow-lift flex flex-col justify-between md:hidden"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <span className="font-mono text-xs font-bold tracking-widest uppercase text-foreground">
                  NAVIGATION DECK
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClose}
                  aria-label="Close menu"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <nav className="flex flex-col gap-1">
                {navItems.map(item => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={onClose}
                    className="p-2.5 rounded font-mono text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-well transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              <Button
                asChild
                className="w-full font-mono text-xs font-bold h-10"
              >
                <Link to="/login" onClick={onClose}>
                  OPEN CONSOLE
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="w-full font-mono text-xs h-9 gap-1.5"
              >
                <a
                  href="https://github.com/naveedkhan1998/realtime-chat-app"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Github className="size-3.5" />
                  VIEW SOURCE ON GITHUB
                </a>
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border bg-well/60 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="panel p-6 border border-border bg-card shadow-panel">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border">
            <div className="space-y-2">
              <BrandMark size={40} wordmark />
              <p className="font-mono text-xs text-muted-foreground max-w-md">
                An open-source full-duplex communication console engineered with Django Channels, Redis Pub/Sub, React 18, and WebRTC audio engines.
              </p>
            </div>

            {/* Spec Plate */}
            <div className="rounded-lg border border-border bg-well p-3 font-mono text-2xs space-y-1 self-start md:self-auto">
              <div className="text-foreground font-bold">
                DEVICE: MODEL RT-2
              </div>
              <div className="text-muted-foreground">
                SERIAL: MNK-084-2026 &middot; TYPE: ASYNC-TRANSCEIVER
              </div>
              <div className="text-muted-foreground">
                LICENSE: MIT OPEN SOURCE
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 font-mono text-xs text-muted-foreground">
            <div>
              &copy; {new Date().getFullYear()} M. Naveed Khan &middot; Built with precision
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://github.com/naveedkhan1998/realtime-chat-app"
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                <span>GitHub</span>
                <ExternalLink className="size-3" />
              </a>
              <Link to="/login" className="hover:text-foreground transition-colors">
                Terminal Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
