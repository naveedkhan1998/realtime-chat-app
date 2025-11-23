import LoginRegistration from '@/components/custom/LoginRegistration';
import { motion } from 'framer-motion';
import { Code2, Zap, Database } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function LoginPage() {
  return (
    <div className="grid items-center h-full gap-4 lg:grid-cols-2 lg:gap-12">
      <Helmet>
        <title>Login | MNK Chat</title>
        <meta name="description" content="Login to MNK Chat Application" />
      </Helmet>
      {/* Left Side - Visuals */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-col justify-between h-full rounded-[2.5rem] bg-card/30 border border-border p-12 relative overflow-hidden backdrop-blur-3xl"
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 mix-blend-overlay" />
        <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 rounded-full w-96 h-96 bg-primary/20 blur-[100px]" />
        <div className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 rounded-full w-80 h-80 bg-secondary/20 blur-[100px]" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="flex items-center justify-center w-12 h-12 overflow-hidden text-white shadow-lg rounded-2xl bg-gradient-to-br from-primary to-violet-600 shadow-primary/20">
              <img
                src="/apple-touch-icon.png"
                alt="Logo"
                className="object-cover w-full h-full"
              />
            </div>
            <span className="text-2xl font-bold tracking-tight">MNK Chat</span>
          </div>

          <h1 className="mb-6 text-5xl font-bold leading-tight">
            Real-time Chat <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">
              Portfolio Demo.
            </span>
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            Explore this full-stack showcase featuring Django Channels, Redis,
            and React. Built to demonstrate scalable real-time architecture.
          </p>
        </div>

        <div className="relative z-10 grid gap-6 mt-12">
          <FeatureRow
            icon={Zap}
            title="WebSocket Powered"
            desc="Instant messaging using Django Channels & Redis"
            delay={0.2}
          />
          <FeatureRow
            icon={Code2}
            title="Modern Frontend"
            desc="React, TypeScript, and Tailwind CSS"
            delay={0.3}
          />
          <FeatureRow
            icon={Database}
            title="Full Stack"
            desc="PostgreSQL database with DRF API"
            delay={0.4}
          />
        </div>

        <div className="relative z-10 pt-8 mt-12 border-t border-border">
          <p className="text-sm text-muted-foreground">
            "Feel free to create an account and test the real-time capabilities.
            This is a personal learning project."
          </p>
        </div>
      </motion.div>

      {/* Right Side - Form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="flex flex-col justify-center w-full max-w-md mx-auto"
      >
        <div className="mb-8 text-center lg:text-left">
          <h2 className="mb-2 text-3xl font-bold">Welcome Back</h2>
          <p className="text-muted-foreground">
            Sign in or register to start chatting.
          </p>
        </div>

        <div className="p-6 border shadow-2xl bg-card/80 backdrop-blur-xl border-border shadow-primary/5 rounded-3xl md:p-8">
          <LoginRegistration />
        </div>

        <p className="mt-8 text-sm text-center text-muted-foreground">
          This is a demo environment. Data may be reset periodically.
        </p>
      </motion.div>
    </div>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  desc,
  delay,
}: {
  icon: any;
  title: string;
  desc: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="flex items-start gap-4 p-4 transition-colors border rounded-2xl bg-card/50 border-border backdrop-blur-md hover:bg-accent/50"
    >
      <div className="p-2 mt-1 rounded-lg bg-primary/10 text-primary">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </motion.div>
  );
}
