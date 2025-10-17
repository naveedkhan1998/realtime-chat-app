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
        className="relative hidden overflow-hidden rounded-3xl glass-card p-8 shadow-glass lg:flex lg:flex-col"
      >
        <div className="absolute inset-0 -z-10 gradient-mesh opacity-30" />
        <div className="absolute inset-0 -z-10">
          <div className="absolute -left-12 top-12 h-48 w-48 rounded-full bg-primary/30 blur-3xl animate-float" />
          <div className="absolute bottom-10 right-0 h-56 w-56 rounded-full bg-accent/30 blur-[130px] animate-float" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
            <Waves className="h-5 w-5" />
          </span>
          <p className="text-sm font-bold uppercase tracking-[0.35em] bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">MNK Chat</p>
        </div>
        
        <div className="mt-10 space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 12 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.6, delay: 0.1 }} 
            className="text-4xl font-bold text-foreground leading-tight"
          >
            A learning ground for realtime chat.
          </motion.h1>
          <p className="max-w-md text-base text-muted-foreground leading-relaxed">
            This login takes you into my practice project for Django Channels, React, and realtime messaging. It lives in my portfolio so you can see the stack choices and UX decisions in context.
          </p>
        </div>
        
        <ul className="mt-10 space-y-4 text-sm">
          {highlights.map((item, idx) => (
            <motion.li
              key={item}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + idx * 0.1 }}
              className="flex items-start gap-3 rounded-2xl glass p-4 shadow-md hover:shadow-lg transition-all duration-300"
            >
              <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-left text-sm font-medium text-foreground">{item}</span>
            </motion.li>
          ))}
        </ul>
        
        <div className="mt-auto flex flex-col gap-3 rounded-2xl glass-strong p-5 text-sm shadow-inner border border-primary/20">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-4 w-4" />
            <span className="font-semibold">What to expect</span>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            Accounts, friendships, groups, and messages run on Django, Postgres, Channels, and Redis. Treat it like a sandbox, not a production environment.
          </p>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <MessageCircle className="h-3.5 w-3.5" />
            React · Django · Redis · Postgres
          </div>
        </div>
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        transition={{ duration: 0.6 }} 
        className="flex w-full flex-col justify-center"
      >
        <LoginRegistration />
      </motion.div>
    </div>
  );
}
