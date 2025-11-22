import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Zap, 
  Shield, 
  Code2, 
  Database, 
  Server, 
  ArrowRight, 
  Check, 
  Smartphone,
  Globe,
  Cpu
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-32">
      <HeroSection />
      <FeaturesGrid />
      <WorkflowSection />
      <TechStackSection />
      <CTASection />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative pt-10 lg:pt-20">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-4xl space-y-8"
        >
          <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary backdrop-blur-sm">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
            Now with Real-time Huddles
          </Badge>
          
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-8xl">
            Chat at the speed of <br />
            <span className="bg-gradient-to-r from-primary via-violet-500 to-indigo-500 bg-clip-text text-transparent">
              thought.
            </span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl leading-relaxed">
            Experience seamless real-time communication. Built to demonstrate the power of Django Channels and React working in perfect harmony.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="h-12 rounded-full px-8 text-base shadow-lg shadow-primary/25 transition-all hover:scale-105 hover:shadow-primary/40">
              <Link to="/login">
                Start Chatting
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 rounded-full px-8 text-base backdrop-blur-sm hover:bg-primary/5">
              <a href="https://github.com/naveedkhan1998/realtime-chat-app" target="_blank" rel="noreferrer">
                View Source
              </a>
            </Button>
          </div>
        </motion.div>

        {/* Hero Image / Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 20 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative mx-auto mt-20 max-w-6xl perspective-1000"
        >
          <div className="relative overflow-hidden rounded-xl border border-border/40 bg-background/50 shadow-2xl shadow-primary/10 backdrop-blur-xl ring-1 ring-white/10">
            <div className="absolute top-0 flex w-full items-center gap-2 border-b border-border/40 bg-muted/20 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <div className="mx-auto h-6 w-2/3 rounded-md bg-muted/40" />
            </div>
            
            {/* Mock Interface Content */}
            <div className="grid h-[400px] grid-cols-[280px_1fr] divide-x divide-border/40 sm:h-[600px]">
              <div className="hidden bg-muted/10 p-4 sm:block">
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg p-2 hover:bg-primary/5">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-24 rounded bg-muted-foreground/20" />
                        <div className="h-2 w-16 rounded bg-muted-foreground/10" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col bg-background/40">
                <div className="flex-1 p-6 space-y-6">
                  <div className="flex gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/20" />
                    <div className="space-y-2">
                      <div className="rounded-2xl rounded-tl-none bg-muted/30 px-4 py-2 text-sm">
                        Hey! Have you checked out the new huddle feature? 🎙️
                      </div>
                      <span className="text-xs text-muted-foreground">10:42 AM</span>
                    </div>
                  </div>
                  <div className="flex flex-row-reverse gap-4">
                    <div className="h-10 w-10 rounded-full bg-accent/20" />
                    <div className="space-y-2">
                      <div className="rounded-2xl rounded-tr-none bg-primary text-primary-foreground px-4 py-2 text-sm shadow-md shadow-primary/20">
                        Yeah! The audio quality is surprisingly good. 
                        And the shared text pad is a game changer for code reviews.
                      </div>
                      <span className="text-xs text-muted-foreground text-right block">10:44 AM</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-border/40 p-4">
                  <div className="h-12 w-full rounded-full bg-muted/20 border border-border/20" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Decorative Elements behind preview */}
          <div className="absolute -inset-4 -z-10 bg-gradient-to-r from-primary/20 to-accent/20 blur-3xl opacity-30 rounded-[3rem]" />
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesGrid() {
  return (
    <section id="features" className="container mx-auto px-4">
      <div className="mb-16 text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">Everything you need</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          A complete suite of communication tools packed into one seamless interface.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
        {/* Large Feature - Realtime */}
        <div className="md:col-span-2 row-span-1 rounded-3xl border border-border/50 bg-card/50 p-8 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-48 h-48" />
          </div>
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Instant Delivery</h3>
              <p className="text-muted-foreground max-w-md">
                Powered by WebSockets and Redis, messages are delivered instantly. No loading spinners, no waiting.
              </p>
            </div>
          </div>
        </div>

        {/* Feature - Security */}
        <div className="rounded-3xl border border-border/50 bg-card/50 p-8 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Shield className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="h-12 w-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-500 mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Secure Auth</h3>
            <p className="text-muted-foreground text-sm">
              JWT based authentication with secure cookie handling.
            </p>
          </div>
        </div>

        {/* Feature - Collaboration */}
        <div className="rounded-3xl border border-border/50 bg-card/50 p-8 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute -bottom-4 -right-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Code2 className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 mb-4">
              <Code2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold mb-2">Live Code</h3>
            <p className="text-muted-foreground text-sm">
              Collaborative text pad for sharing code snippets in real-time.
            </p>
          </div>
        </div>

        {/* Large Feature - Huddles */}
        <div className="md:col-span-2 row-span-1 rounded-3xl border border-border/50 bg-card/50 p-8 relative overflow-hidden group hover:border-primary/30 transition-colors">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <MessageCircle className="w-48 h-48" />
          </div>
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="h-12 w-12 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-500 mb-4">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Group Huddles</h3>
              <p className="text-muted-foreground max-w-md">
                Jump into voice channels or group chats instantly. Perfect for quick syncs or hanging out.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  const steps = [
    { title: "Sign Up", desc: "Create your account in seconds." },
    { title: "Find Friends", desc: "Search and add people to your network." },
    { title: "Start Chatting", desc: "Instant messaging & collaboration." },
  ];

  return (
    <section id="workflow" className="container mx-auto px-4 py-20">
      <div className="relative rounded-[2.5rem] bg-gradient-to-b from-primary/5 to-transparent border border-primary/10 p-12 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        
        <div className="relative z-10 text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">How it works</h2>
          <p className="text-muted-foreground">Simple, fast, and effective.</p>
        </div>

        <div className="relative z-10 grid md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center text-xl font-bold text-primary mb-6 shadow-lg shadow-primary/10">
                {i + 1}
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TechStackSection() {
  const techs = [
    { icon: Globe, label: "React" },
    { icon: Smartphone, label: "Tailwind" },
    { icon: Server, label: "Django" },
    { icon: Database, label: "PostgreSQL" },
    { icon: Zap, label: "Redis" },
    { icon: Cpu, label: "Channels" },
  ];

  return (
    <section id="stack" className="border-y border-border/40 bg-muted/20 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold">Powered by modern tech</h2>
        </div>
        <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-70 grayscale transition-all hover:grayscale-0 hover:opacity-100">
          {techs.map((tech) => (
            <div key={tech.label} className="flex flex-col items-center gap-3 group">
              <div className="p-4 rounded-2xl bg-background border border-border/50 shadow-sm group-hover:scale-110 transition-transform group-hover:border-primary/30">
                <tech.icon className="w-8 h-8" />
              </div>
              <span className="text-sm font-medium">{tech.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="container mx-auto px-4 pb-20">
      <div className="rounded-[3rem] bg-primary text-primary-foreground px-8 py-20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-2xl mx-auto space-y-8">
          <h2 className="text-4xl font-bold sm:text-5xl">Ready to dive in?</h2>
          <p className="text-primary-foreground/80 text-lg">
            Join the demo environment and experience the realtime capabilities firsthand.
          </p>
          <Button asChild size="lg" variant="secondary" className="h-14 rounded-full px-10 text-lg shadow-xl hover:scale-105 transition-transform">
            <Link to="/login">Get Started Now</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
