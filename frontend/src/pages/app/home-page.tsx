import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle,
  Zap,
  Shield,
  Database,
  Server,
  ArrowRight,
  Smartphone,
  Globe,
  Cpu,
  Radio,
  Bell,
} from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function HomePage() {
  return (
    <div className="space-y-32">
      <Helmet>
        <title>MNK Chat - Realtime Messaging & Voice Huddles</title>
        <meta
          name="description"
          content="Experience instant messaging, crystal-clear voice huddles, and smart offline-first notifications. Built with React, Django Channels, and WebRTC."
        />
        {/* Open Graph tags are inherited from index.html for the home page, 
            but we can re-declare them to ensure client-side navigation consistency */}
        <meta
          property="og:title"
          content="MNK Chat - Realtime Messaging & Voice Huddles"
        />
        <meta
          property="og:description"
          content="Experience instant messaging, crystal-clear voice huddles, and smart offline-first notifications. Built with React, Django Channels, and WebRTC."
        />
        <meta property="og:url" content="https://chat.mnaveedk.com/" />
      </Helmet>
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
      <div className="container px-4 mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <Badge
            variant="outline"
            className="rounded-full border-primary/20 bg-primary/10 px-4 py-1.5 text-sm text-primary backdrop-blur-sm"
          >
            <span className="inline-block w-2 h-2 mr-2 rounded-full bg-primary animate-pulse" />
            Now with Real-time Huddles
          </Badge>

          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-7xl lg:text-8xl">
            Chat at the speed of <br />
            <span className="text-transparent bg-gradient-to-r from-primary via-violet-500 to-indigo-500 bg-clip-text">
              thought.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Experience seamless real-time communication. Built to demonstrate
            the power of Django Channels and React working in perfect harmony.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              className="h-12 px-8 text-base transition-all rounded-full shadow-lg shadow-primary/25 hover:scale-105 hover:shadow-primary/40"
            >
              <Link to="/login">
                Start Chatting
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base rounded-full backdrop-blur-sm bg-background/50 border-border hover:bg-accent/50"
            >
              <a
                href="https://github.com/naveedkhan1998/realtime-chat-app"
                target="_blank"
                rel="noreferrer"
              >
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
          className="relative max-w-6xl mx-auto mt-20 perspective-1000"
        >
          {/* Glass Container with Enhanced Border */}
          <div className="relative overflow-hidden border shadow-2xl rounded-xl border-border bg-background/60 shadow-primary/20 backdrop-blur-2xl ring-1 ring-border/50 group">
            {/* Gradient Border Effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />

            {/* Window Controls */}
            <div className="absolute top-0 flex items-center w-full gap-2 px-4 py-3 border-b border-border/50 bg-muted/30 backdrop-blur-md z-20">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80 shadow-sm" />
                <div className="w-3 h-3 rounded-full bg-green-500/80 shadow-sm" />
              </div>
              <div className="w-2/3 h-6 mx-auto rounded-md bg-muted/50 border border-border/20" />
            </div>

            {/* Mock Interface Content */}
            <div className="grid h-[400px] grid-cols-1 sm:grid-cols-[280px_1fr] divide-y sm:divide-y-0 sm:divide-x divide-border/50 sm:h-[600px] relative z-10">
              {/* Sidebar - Hidden on mobile, visible on sm+ */}
              <div className="hidden p-4 bg-muted/30 sm:block backdrop-blur-sm">
                <div className="space-y-4 mt-12">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors cursor-default"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border border-border/50" />
                      <div className="space-y-1.5">
                        <div className="w-24 h-3 rounded bg-muted-foreground/20" />
                        <div className="w-16 h-2 rounded bg-muted-foreground/10" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex flex-col bg-transparent h-full">
                <div className="flex-1 p-6 space-y-6 mt-12 overflow-hidden">
                  <div className="flex gap-4 animate-in slide-in-from-left-4 duration-700 fade-in">
                    <div className="w-10 h-10 rounded-full bg-primary/60 border border-border/50 shrink-0" />
                    <div className="space-y-2 max-w-[85%]">
                      <div className="px-4 py-3 text-sm rounded-tl-none rounded-2xl bg-muted/50 border border-border/50 backdrop-blur-sm">
                        Hey! Have you checked out the new huddle feature? 🎙️
                      </div>
                      <span className="text-xs text-muted-foreground">
                        10:42 AM
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-row-reverse gap-4 animate-in slide-in-from-right-4 duration-700 delay-300 fade-in fill-mode-backwards">
                    <div className="w-10 h-10 rounded-full bg-accent/20 border border-border/50 shrink-0" />
                    <div className="space-y-2 max-w-[85%]">
                      <div className="px-4 py-3 text-sm rounded-tr-none shadow-lg rounded-2xl bg-primary text-primary-foreground shadow-primary/20 border border-primary/20">
                        Yeah! The audio quality is surprisingly good. And the
                        shared text pad is a game changer for code reviews.
                      </div>
                      <span className="block text-xs text-right text-muted-foreground">
                        10:44 AM
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t border-border/50 bg-muted/30 backdrop-blur-sm">
                  <div className="w-full h-12 border rounded-full bg-muted/50 border-border/50 flex items-center px-4">
                    <div className="w-24 h-2 rounded bg-muted-foreground/20" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative Elements behind preview */}
          <div className="absolute -inset-4 -z-10 bg-gradient-to-r from-primary/30 to-accent/30 blur-3xl opacity-40 rounded-[3rem] animate-pulse-slow" />
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesGrid() {
  return (
    <section id="features" className="container px-4 mx-auto">
      <div className="mb-16 text-center">
        <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need
        </h2>
        <p className="max-w-2xl mx-auto text-muted-foreground">
          A complete suite of communication tools packed into one seamless
          interface.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
        {/* Large Feature - Realtime */}
        <div className="relative row-span-1 p-8 overflow-hidden transition-colors border md:col-span-2 rounded-3xl border-border bg-card/50 backdrop-blur-md group hover:bg-accent/50">
          <div className="absolute top-0 right-0 p-8 transition-opacity opacity-10 group-hover:opacity-20">
            <Zap className="w-48 h-48" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-2xl bg-primary/10 text-primary">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="mb-2 text-2xl font-bold">Instant Delivery</h3>
              <p className="max-w-md text-muted-foreground">
                Powered by WebSockets and Redis, messages are delivered
                instantly. No loading spinners, no waiting.
              </p>
            </div>
          </div>
        </div>

        {/* Feature - Security */}
        <div className="relative p-8 overflow-hidden transition-colors border rounded-3xl border-border bg-card/50 backdrop-blur-md group hover:bg-accent/50">
          <div className="absolute transition-opacity -bottom-4 -right-4 opacity-10 group-hover:opacity-20">
            <Shield className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-center w-12 h-12 mb-4 text-green-500 rounded-2xl bg-green-500/10">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold">Secure Auth</h3>
            <p className="text-sm text-muted-foreground">
              JWT based authentication with secure cookie handling.
            </p>
          </div>
        </div>

        {/* Feature - Smart Notifications */}
        <div className="relative p-8 overflow-hidden transition-colors border rounded-3xl border-border bg-card/50 backdrop-blur-md group hover:bg-accent/50">
          <div className="absolute transition-opacity -bottom-4 -right-4 opacity-10 group-hover:opacity-20">
            <Bell className="w-32 h-32" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-center w-12 h-12 mb-4 text-yellow-500 rounded-2xl bg-yellow-500/10">
              <Bell className="w-6 h-6" />
            </div>
            <h3 className="mb-2 text-xl font-bold">Smart Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Offline-first alerts that sync instantly when you return. Never
              miss a beat with our intelligent coalescing engine.
            </p>
          </div>
        </div>

        {/* Large Feature - Huddles */}
        <div className="relative row-span-1 p-8 overflow-hidden transition-colors border md:col-span-2 rounded-3xl border-border bg-card/50 backdrop-blur-md group hover:bg-accent/50">
          <div className="absolute top-0 right-0 p-8 transition-opacity opacity-10 group-hover:opacity-20">
            <MessageCircle className="w-48 h-48" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-2xl bg-violet-500/10 text-violet-500">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="mb-2 text-2xl font-bold">
                Real-time Voice Huddles
              </h3>
              <p className="max-w-md text-muted-foreground">
                Powered by WebRTC for crystal clear, low-latency audio. We
                leverage a hybrid network of Google and Twilio STUN/TURN servers
                to guarantee reliable connections through any firewall.
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
    { title: 'Sign Up', desc: 'Create your account in seconds.' },
    {
      title: 'Find People',
      desc: 'Search for anyone and start a chat instantly.',
    },
    { title: 'Start Chatting', desc: 'Instant messaging & collaboration.' },
  ];

  return (
    <section id="workflow" className="container px-4 py-20 mx-auto">
      <div className="relative rounded-[2.5rem] bg-card/50 border border-border p-12 overflow-hidden backdrop-blur-md">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />

        <div className="relative z-10 mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold">How it works</h2>
          <p className="text-muted-foreground">Simple, fast, and effective.</p>
        </div>

        <div className="relative z-10 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <div className="flex items-center justify-center w-16 h-16 mb-6 text-xl font-bold border-2 rounded-full shadow-lg bg-background border-border text-primary shadow-primary/10 backdrop-blur-sm">
                {i + 1}
              </div>
              <h3 className="mb-2 text-xl font-semibold">{step.title}</h3>
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
    { icon: Globe, label: 'React' },
    { icon: Smartphone, label: 'Tailwind' },
    { icon: Server, label: 'Django' },
    { icon: Database, label: 'PostgreSQL' },
    { icon: Zap, label: 'Redis' },
    { icon: Cpu, label: 'Channels' },
    { icon: Radio, label: 'WebRTC' },
  ];

  return (
    <section
      id="stack"
      className="py-16 border-y border-border bg-muted/30 backdrop-blur-sm"
    >
      <div className="container px-4 mx-auto">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold">Powered by modern tech</h2>
        </div>
        <div className="flex flex-wrap justify-center gap-8 transition-all md:gap-16 opacity-70 grayscale hover:grayscale-0 hover:opacity-100">
          {techs.map(tech => (
            <div
              key={tech.label}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="p-4 transition-transform border shadow-sm rounded-2xl bg-card border-border group-hover:scale-110 group-hover:bg-accent/50">
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
    <section className="container px-4 pb-20 mx-auto">
      <div className="rounded-[3rem] bg-gradient-to-br from-primary to-violet-600 text-primary-foreground px-8 py-20 text-center relative overflow-hidden shadow-2xl shadow-primary/20">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute w-64 h-64 rounded-full -top-24 -left-24 bg-white/10 blur-3xl" />
        <div className="absolute w-64 h-64 rounded-full -bottom-24 -right-24 bg-white/10 blur-3xl" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-8">
          <h2 className="text-4xl font-bold sm:text-5xl">Ready to dive in?</h2>
          <p className="text-lg text-primary-foreground/80">
            Join the demo environment and experience the realtime capabilities
            firsthand.
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="px-10 text-lg transition-transform rounded-full shadow-xl h-14 hover:scale-105"
          >
            <Link to="/login">Get Started Now</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
