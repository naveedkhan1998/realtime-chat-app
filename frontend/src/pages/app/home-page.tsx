import { Link } from "react-router-dom";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { MessageCircle, ShieldCheck, Users, Clock, Server, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";

const featureList = [
  {
    icon: MessageCircle,
    title: "Direct and group chats",
    description: "Start one-on-one conversations or create groups to try the realtime flow with your friends list.",
  },
  {
    icon: Clock,
    title: "Realtime powered by Channels",
    description: "Django Channels, Redis, and WebSockets keep messages moving without manual refreshes.",
  },
  {
    icon: ShieldCheck,
    title: "Honest portfolio project",
    description: "Built to learn how React, Django REST Framework, and Channels fit together in a single stack.",
  },
];

const workflowHighlights = [
  {
    title: "Create an account",
    bullet: "Register with email and set up your profile to join the demo environment.",
  },
  {
    title: "Add a few friends",
    bullet: "Search for other users, send requests, and build a list before you chat.",
  },
  {
    title: "See messages in realtime",
    bullet: "Open direct or group threads and watch updates land instantly over WebSockets.",
  },
];

const infrastructureCallouts = [
  {
    icon: Server,
    label: "Backend: Django REST Framework plus Channels served over ASGI.",
  },
  {
    icon: MessageCircle,
    label: "Realtime transport: Redis channel layer and WebSockets for live messaging.",
  },
  {
    icon: Users,
    label: "Data layer: PostgreSQL stores accounts, friendships, and chat history.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-24 pb-20">
      <HeroSection />
      <FeaturesSection />
      <WorkflowSection />
      <InfrastructureSection />
      <CallToAction />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8">
        <Badge className="w-fit bg-primary/10 text-primary hover:bg-primary/15">
          <Sparkles className="mr-2 h-4 w-4" />
          Portfolio project spotlight
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Realtime chat demo built while learning Django Channels.
        </h1>
        <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
          This project showcases how I combined React, TypeScript, Django REST Framework, Channels, Redis, and PostgreSQL to deliver live conversations. It is a personal learning build and the work in progress you see in my portfolio.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg">
            <Link to="/login">Open the app</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#features" className="flex items-center gap-2">
              See what’s inside
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
        <ul className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <FeatureFlag label="React + TypeScript frontend" />
          <FeatureFlag label="Django Channels + Redis realtime layer" />
          <FeatureFlag label="Personal project for learning" />
        </ul>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <div className="relative overflow-hidden rounded-3xl border border-primary/15 bg-white shadow-lg shadow-primary/15 dark:border-primary/25 dark:bg-slate-950">
          <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-primary/5 via-transparent to-accent/10" />
          <aside className="relative grid gap-4 p-6">
            <header className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Product support</p>
                <h2 className="text-lg font-semibold text-foreground">Morning sync • #status</h2>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Live</span>
            </header>
            <div className="space-y-3 rounded-2xl border border-primary/10 bg-white/80 p-4 text-sm shadow-sm shadow-primary/10 backdrop-blur dark:bg-slate-900/80">
              <PreviewMessage author="Hailey" time="08:05" text="Rolled out the new incident triage labels. Docs updated 🔧" />
              <PreviewMessage author="Zhang" time="08:07" text="Handled the support backlog from EU shift—queue is clear." highlight />
              <PreviewMessage author="Iris" time="08:09" text="Staging deploy succeeded. Production handoff at 10:30." />
            </div>
            <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 text-sm text-primary shadow-inner shadow-primary/10">
              <p className="font-semibold">Focus window</p>
              <p className="text-primary/80">Mute noise, pin the threads that matter, and let quiet mode handle the rest.</p>
            </div>
          </aside>
        </div>
      </motion.div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="space-y-10">
      <div className="space-y-4 text-center">
        <Badge className="mx-auto w-fit bg-secondary text-secondary-foreground">What the demo shows</Badge>
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Focused on learning realtime foundations</h2>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground">
          Everything here was built to understand how realtime messaging, authentication, and UI state management fit together across the stack.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featureList.map((feature) => (
          <Card key={feature.title} className="h-full border border-border bg-white/90 shadow-sm shadow-primary/5 backdrop-blur dark:border-primary/25 dark:bg-slate-950/80">
            <CardContent className="space-y-3 p-6">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className="grid gap-10 rounded-3xl border border-primary/15 bg-white/80 p-8 shadow-lg shadow-primary/10 backdrop-blur-lg lg:grid-cols-[0.8fr_1.2fr] dark:border-primary/25 dark:bg-slate-950/80">
      <div className="space-y-4">
        <Badge className="w-fit bg-primary text-white hover:bg-primary/90">How to explore</Badge>
        <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">Test the stack in three steps</h2>
        <p className="text-base text-muted-foreground">Follow the flow to see the Channels-powered experience from authentication to realtime updates.</p>
      </div>
      <div className="space-y-4">
        {workflowHighlights.map((item, index) => (
          <Card key={item.title} className="border border-primary/15 bg-white/90 shadow-sm shadow-primary/5 dark:border-primary/25 dark:bg-slate-950/70">
            <CardContent className="flex items-start gap-4 p-6">
              <span className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{index + 1}</span>
              <div>
                <p className="text-base font-semibold text-foreground">{item.title}</p>
                <p className="text-sm text-muted-foreground">{item.bullet}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function InfrastructureSection() {
  return (
    <section id="stack" className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <div className="space-y-4">
        <Badge className="w-fit bg-primary/10 text-primary">Under the hood</Badge>
        <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">The stack that powers this demo</h2>
        <p className="text-base text-muted-foreground">
          I use familiar open source tools so the focus stays on understanding realtime patterns rather than maintaining production-scale infrastructure.
        </p>
      </div>
      <div className="grid gap-4">
        {infrastructureCallouts.map((item) => (
          <div key={item.label} className="flex items-start gap-3 rounded-2xl border border-primary/15 bg-white/90 p-4 text-sm text-foreground shadow-sm shadow-primary/5 dark:border-primary/25 dark:bg-slate-950/70">
            <item.icon className="mt-0.5 h-4 w-4 text-primary" />
            <p>{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CallToAction() {
  return (
    <section className="rounded-3xl border border-primary/15 bg-gradient-to-br from-primary/10 via-white to-accent/10 p-10 text-center shadow-lg shadow-primary/15 dark:border-primary/25 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-2xl space-y-4">
        <Badge className="mx-auto w-fit bg-white/70 text-primary">Personal demo</Badge>
        <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">Explore the project and see the stack in action</h2>
        <p className="text-base text-muted-foreground">Sign in to click through the flows, and scroll for a quick look at the tools and services involved. Feedback is always welcome.</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/login">Sign in to the demo</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#stack" className="flex items-center gap-2">
              View the stack
            </a>
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
          <ReliabilityPoint label="Learning project: features may change often" />
          <ReliabilityPoint label="Redis + Channels keep chats in sync" />
          <ReliabilityPoint label="PostgreSQL stores demo data locally" />
        </div>
      </div>
    </section>
  );
}

function PreviewMessage({ author, time, text, highlight }: { author: string; time: string; text: string; highlight?: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-4 py-3 shadow-sm transition-colors ${
        highlight ? "border-primary/40 bg-primary/10 text-primary" : "border-primary/10 bg-white/70 text-foreground dark:bg-slate-900/50"
      }`}
    >
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        <span>{author}</span>
        <span>{time}</span>
      </div>
      <p className="mt-2 text-sm font-medium leading-relaxed">{text}</p>
    </div>
  );
}

function FeatureFlag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-3 py-1 text-xs font-medium text-muted-foreground">
      <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
      {label}
    </span>
  );
}

function ReliabilityPoint({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-primary" />
      {label}
    </span>
  );
}
