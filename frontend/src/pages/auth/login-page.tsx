import LoginRegistration from "@/components/custom/LoginRegistration";
import { motion } from "framer-motion";
import { MessageCircle, ShieldCheck, Sparkles, Waves } from "lucide-react";

const highlights = [
  "Built with React, TypeScript, Tailwind, and Vite",
  "Django REST Framework API with Channels for realtime transport",
  "Personal portfolio project while learning WebSockets and Redis",
];

export default function LoginPage() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.05fr]">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="relative hidden overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/20 via-background to-accent/20 p-8 shadow-2xl shadow-primary/20 backdrop-blur-xl lg:flex lg:flex-col"
      >
        <div className="absolute inset-0 -z-10">
          <div className="absolute -left-12 top-12 h-48 w-48 rounded-full bg-primary/40 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-56 w-56 rounded-full bg-accent/40 blur-[130px]" />
        </div>
        <div className="flex items-center gap-3 text-primary">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30">
            <Waves className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold uppercase tracking-[0.35em]">MNK Chat</p>
        </div>
        <div className="mt-10 space-y-4">
          <motion.h1 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="text-4xl font-semibold text-foreground">
            A learning ground for realtime chat.
          </motion.h1>
          <p className="max-w-md text-base text-muted-foreground">
            This login takes you into my practice project for Django Channels, React, and realtime messaging. It lives in my portfolio so you can see the stack choices and UX decisions in context.
          </p>
        </div>
        <ul className="mt-10 space-y-4 text-sm text-muted-foreground">
          {highlights.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-2xl border border-white/30 bg-white/60 p-4 shadow-lg shadow-primary/10 backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
              <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-left text-sm font-medium text-foreground">{item}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/10 p-5 text-sm text-primary shadow-inner shadow-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-4 w-4" />
            <span className="font-semibold">What to expect</span>
          </div>
          <p className="text-primary/80">Accounts, friendships, groups, and messages run on Django, Postgres, Channels, and Redis. Treat it like a sandbox, not a production environment.</p>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary/60">
            <MessageCircle className="h-3.5 w-3.5" />
            React · Django · Redis · Postgres
          </div>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="flex w-full flex-col justify-center">
        <LoginRegistration />
      </motion.div>
    </div>
  );
}
