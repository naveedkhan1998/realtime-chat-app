import LoginRegistration from '@/components/custom/LoginRegistration';
import { motion } from 'framer-motion';
import { MessageSquare, Code2, Zap, Database } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="grid lg:grid-cols-2 gap-4 lg:gap-12 h-full min-h-[600px] items-center">
      {/* Left Side - Visuals */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex flex-col justify-between h-full min-h-[600px] rounded-[2.5rem] bg-primary/5 border border-primary/10 p-12 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-30" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
              <MessageSquare className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight">MNK Chat</span>
          </div>

          <h1 className="text-5xl font-bold leading-tight mb-6">
            Real-time Chat <br />
            <span className="text-primary">Portfolio Demo.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-md">
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

        <div className="relative z-10 mt-12 pt-8 border-t border-primary/10">
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
          <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
          <p className="text-muted-foreground">
            Sign in or register to start chatting.
          </p>
        </div>

        <div className="bg-card border border-border/50 shadow-xl shadow-primary/5 rounded-3xl p-6 md:p-8">
          <LoginRegistration />
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
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
      className="flex items-start gap-4 p-4 rounded-2xl bg-background/40 border border-primary/5 backdrop-blur-sm"
    >
      <div className="mt-1 p-2 rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </motion.div>
  );
}
