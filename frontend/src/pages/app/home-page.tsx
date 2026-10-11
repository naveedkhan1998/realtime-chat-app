import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Radio,
  MessageSquare,
  Bell,
  Terminal,
  ExternalLink,
  Github,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandMark } from '@/components/console/BrandMark';
import {
  Led,
  LcdClock,
  LevelMeter,
  SectionLabel,
} from '@/components/console';

export default function HomePage() {
  return (
    <div className="space-y-24 sm:space-y-32">
      <Helmet>
        <title>MNK Chat | Model RT-2 Console</title>
        <meta
          name="description"
          content="An open-source full-duplex communication console. Instant Django Channels WebSockets, WebRTC voice huddles, and tactile precision."
        />
        <meta property="og:title" content="MNK Chat | Model RT-2 Console" />
        <meta
          property="og:description"
          content="Full-duplex real-time messaging and voice huddles engineered like hardware."
        />
        <meta property="og:url" content="https://chat.mnaveedk.com/" />
      </Helmet>

      {/* Hero Section with Hardware Mock */}
      <HeroSection />

      {/* Three Operating Modes */}
      <ModesSection />

      {/* Architecture & Topology Flow */}
      <ArchitectureSection />

      {/* Technical Datasheet */}
      <DatasheetSection />

      {/* Quickstart Terminal */}
      <QuickstartSection />

      {/* Action Banner */}
      <CtaSection />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
        {/* Left Column: Headlines & Callouts */}
        <div className="lg:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded border border-border bg-well font-mono text-2xs text-muted-foreground">
            <Led tone="live" blink />
            <span>SPEC: MODEL RT-2 &middot; FIRMWARE V2.4 &middot; FULL DUPLEX</span>
          </div>

          <h1 className="display-wide text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.05]">
            TALK IN <br />
            <span className="text-primary underline decoration-primary/40 underline-offset-8">
              REALTIME.
            </span>
          </h1>

          <p className="font-mono text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
            A full-duplex communication console built like a precision hardware instrument.
            Engineered with Django Channels WebSockets, WebRTC voice huddles, and zero generic marketing fluff.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="font-mono text-xs sm:text-sm font-bold h-12 px-6 gap-2"
            >
              <Link to="/login">
                OPEN THE CONSOLE
                <ArrowRight className="size-4" />
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="font-mono text-xs sm:text-sm h-12 px-5 gap-2"
            >
              <a
                href="https://github.com/naveedkhan1998/realtime-chat-app"
                target="_blank"
                rel="noreferrer"
              >
                <Github className="size-4" />
                VIEW SOURCE
              </a>
            </Button>
          </div>

          {/* Key Metric Strip */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border max-w-lg font-mono text-xs">
            <div>
              <div className="text-foreground font-bold text-sm sm:text-base">
                &lt;40ms
              </div>
              <div className="text-2xs text-muted-foreground">
                AUDIO ROUNDTRIP
              </div>
            </div>
            <div>
              <div className="text-foreground font-bold text-sm sm:text-base">
                100%
              </div>
              <div className="text-2xs text-muted-foreground">
                OPEN SOURCE
              </div>
            </div>
            <div>
              <div className="text-foreground font-bold text-sm sm:text-base">
                WEBRTC
              </div>
              <div className="text-2xs text-muted-foreground">
                MESH + SFU VOX
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pure CSS Hardware Console Mockup */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-md panel border-2 border-border bg-card p-5 shadow-lift relative rounded-2xl">
            {/* 4 Corner Screws */}
            <div className="screw absolute top-3 left-3" />
            <div className="screw absolute top-3 right-3" />
            <div className="screw absolute bottom-3 left-3" />
            <div className="screw absolute bottom-3 right-3" />

            {/* Header Control Strip */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border px-2">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-primary ring-2 ring-primary/30" />
                <span className="font-mono text-xs font-bold tracking-wider text-foreground">
                  MNK-RT2
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">
                  VOX
                </span>
                <Led tone="live" blink />
                <span className="font-mono text-[10px] text-muted-foreground">
                  PWR
                </span>
                <Led tone="signal" />
              </div>
            </div>

            {/* Amber LCD Screen */}
            <div className="lcd p-3.5 rounded-lg mb-4 space-y-2.5">
              <div className="flex items-center justify-between font-mono text-2xs text-primary/80 border-b border-primary/20 pb-1">
                <span>RX/TX CH·01</span>
                <LcdClock />
              </div>

              {/* Simulated Log Feed */}
              <div className="space-y-1 font-mono text-xs text-primary">
                <div className="flex items-center justify-between text-2xs">
                  <span>SIGNAL STRENGTH: 98.4 dBm</span>
                  <span>OPUS 48 kHz</span>
                </div>
                <div className="truncate font-semibold pt-0.5">
                  &gt; CONNECTED TO STATION GATEWAY
                </div>
                <div className="text-2xs opacity-80 truncate">
                  &gt; DISPATCH: 4 OPERATORS ON AIR
                </div>
              </div>

              {/* Mini Level Meter Bar inside LCD */}
              <div className="pt-1 flex items-center gap-2">
                <span className="font-mono text-[9px] text-primary/70">VU</span>
                <div className="flex-1">
                  <LevelMeter level={0.72} bars={16} />
                </div>
              </div>
            </div>

            {/* Physical Control Surface */}
            <div className="grid grid-cols-12 gap-3 mb-3">
              {/* Speaker Grille */}
              <div className="col-span-7 grille h-20 rounded-lg border border-border p-2 flex items-center justify-center">
                <span className="font-mono text-[10px] text-muted-foreground/60 tracking-widest uppercase bg-card/80 px-2 py-0.5 rounded">
                  MONITOR SPEAKER
                </span>
              </div>

              {/* Rotary Dial / Brandmark */}
              <div className="col-span-5 rounded-lg border border-border bg-well p-2 flex flex-col items-center justify-center">
                <BrandMark size={36} wordmark={false} />
                <span className="font-mono text-[9px] text-muted-foreground mt-1 uppercase">
                  TUNING
                </span>
              </div>
            </div>

            {/* Tactile Keypad Strip */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                className="key p-2 rounded-lg text-center flex flex-col items-center justify-center cursor-pointer"
              >
                <MessageSquare className="size-3.5 text-primary mb-1" />
                <span className="font-mono text-[10px] font-bold text-foreground">
                  MSG
                </span>
              </button>

              <button
                type="button"
                className="key-signal p-2 rounded-lg text-center flex flex-col items-center justify-center cursor-pointer"
              >
                <Radio className="size-3.5 mb-1" />
                <span className="font-mono text-[10px] font-bold">
                  VOX
                </span>
              </button>

              <button
                type="button"
                className="key p-2 rounded-lg text-center flex flex-col items-center justify-center cursor-pointer"
              >
                <Bell className="size-3.5 text-foreground mb-1" />
                <span className="font-mono text-[10px] font-bold text-foreground">
                  NTF
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ModesSection() {
  return (
    <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="mb-8">
        <SectionLabel>OPERATING MODES</SectionLabel>
        <h2 className="display-wide text-2xl sm:text-4xl font-bold tracking-tight text-foreground mt-1">
          THREE DEDICATED CHANNELS.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mode 01: Text TX/RX */}
        <div className="panel p-5 border border-border bg-card shadow-panel space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="label-engraved text-primary font-bold">
              MODE 01 / TX-RX
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              WEBSOCKET
            </span>
          </div>

          <h3 className="font-mono text-base font-bold text-foreground">
            Realtime Messaging & Channels
          </h3>
          <p className="font-mono text-xs text-muted-foreground leading-relaxed">
            Persistent bidirectional socket connections via Django Channels. Full Markdown support, multi-attachment upload pipelines, and read receipts.
          </p>

          <div className="rounded-lg border border-border bg-well p-3 font-mono text-2xs space-y-1.5">
            <div className="text-muted-foreground flex justify-between">
              <span>LATENCY:</span>
              <span className="text-foreground font-semibold">&lt; 15ms</span>
            </div>
            <div className="text-muted-foreground flex justify-between">
              <span>ATTACHMENTS:</span>
              <span className="text-foreground font-semibold">IMAGES, DOCS</span>
            </div>
            <div className="text-muted-foreground flex justify-between">
              <span>RECEIPTS:</span>
              <span className="text-live font-semibold">DELIVERED &middot; READ</span>
            </div>
          </div>
        </div>

        {/* Mode 02: VOX Audio Huddles */}
        <div className="panel p-5 border border-border bg-card shadow-panel space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="label-engraved text-live font-bold">
              MODE 02 / VOX HUDDLES
            </span>
            <span className="font-mono text-[10px] text-live flex items-center gap-1">
              <Led tone="live" blink />
              LIVE
            </span>
          </div>

          <h3 className="font-mono text-base font-bold text-foreground">
            Low-Latency Voice Rooms
          </h3>
          <p className="font-mono text-xs text-muted-foreground leading-relaxed">
            Dual-topology WebRTC engine: P2P peer mesh for direct calls, automatically transitioning to Cloudflare SFU relay for larger groups without packet drop.
          </p>

          <div className="rounded-lg border border-border bg-well p-3 font-mono text-2xs space-y-1.5">
            <div className="text-muted-foreground flex justify-between">
              <span>TOPOLOGY:</span>
              <span className="text-foreground font-semibold">MESH / SFU HYBRID</span>
            </div>
            <div className="text-muted-foreground flex justify-between">
              <span>CODEC:</span>
              <span className="text-foreground font-semibold">OPUS 48 kHz STEREO</span>
            </div>
            <div className="text-muted-foreground flex justify-between">
              <span>METERS:</span>
              <span className="text-live font-semibold">REAL-TIME VU LEVEL</span>
            </div>
          </div>
        </div>

        {/* Mode 03: Telemetry & Dispatch */}
        <div className="panel p-5 border border-border bg-card shadow-panel space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="label-engraved text-foreground font-bold">
              MODE 03 / DISPATCH
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              TELEMETRY
            </span>
          </div>

          <h3 className="font-mono text-base font-bold text-foreground">
            Dispatch & Activity Ledger
          </h3>
          <p className="font-mono text-xs text-muted-foreground leading-relaxed">
            Print-tape activity logging for all station alerts, friend signals, and system dispatches. Desktop push integration keeps operators informed.
          </p>

          <div className="rounded-lg border border-border bg-well p-3 font-mono text-2xs space-y-1.5">
            <div className="text-muted-foreground flex justify-between">
              <span>LEDGER:</span>
              <span className="text-foreground font-semibold">CHRONOLOGICAL TAPE</span>
            </div>
            <div className="text-muted-foreground flex justify-between">
              <span>DISPATCH:</span>
              <span className="text-foreground font-semibold">OS NOTIFICATION API</span>
            </div>
            <div className="text-muted-foreground flex justify-between">
              <span>ACOUSTICS:</span>
              <span className="text-foreground font-semibold">TWO-TONE CHIME</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ArchitectureSection() {
  return (
    <section id="architecture" className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="mb-8">
        <SectionLabel>SYSTEM TOPOLOGY</SectionLabel>
        <h2 className="display-wide text-2xl sm:text-4xl font-bold tracking-tight text-foreground mt-1">
          HOW PACKETS FLOW.
        </h2>
      </div>

      <div className="panel p-6 border border-border bg-card shadow-panel">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-border bg-well p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary">01</span>
              <span className="font-mono text-xs font-bold text-foreground">REACT CLIENT</span>
            </div>
            <p className="font-mono text-2xs text-muted-foreground">
              Vite + React 18, Redux Toolkit state slice, and tactile Tailwind UI primitives.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-well p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary">02</span>
              <span className="font-mono text-xs font-bold text-foreground">DJANGO ASGI</span>
            </div>
            <p className="font-mono text-2xs text-muted-foreground">
              Daphne ASGI server handling WebSocket routing, token verification, and message consumers.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-well p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary">03</span>
              <span className="font-mono text-xs font-bold text-foreground">REDIS PUB/SUB</span>
            </div>
            <p className="font-mono text-2xs text-muted-foreground">
              In-memory channel layer coordinating multi-worker broadcasts and real-time room presence.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-well p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-live">04</span>
              <span className="font-mono text-xs font-bold text-foreground">WEBRTC SFU</span>
            </div>
            <p className="font-mono text-2xs text-muted-foreground">
              Cloudflare TURN & SFU routing full-duplex Opus audio streams with low jitter.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function DatasheetSection() {
  const specs = [
    { label: 'SOCKET CARRIER', value: 'WebSocket RFC 6455 · Django Channels 4' },
    { label: 'VOICE PROTOCOL', value: 'WebRTC P2P Mesh (≤2) · Cloudflare SFU (3+)' },
    { label: 'AUDIO ENCODING', value: 'Opus 48 kHz Fullband Stereo' },
    { label: 'DATABASE ENGINE', value: 'PostgreSQL 16 Relational Storage' },
    { label: 'CHANNEL LAYER', value: 'Redis 7 In-Memory Pub/Sub Engine' },
    { label: 'CLIENT MATRIX', value: 'React 18 · Vite · Redux Toolkit · RTK Query' },
    { label: 'CHASSIS PALETTE', value: 'Ceramic Bone (#E3E0D9) / Graphite (#121110)' },
    { label: 'CONTAINERIZATION', value: 'Docker Compose · Multi-stage Alpine builds' },
  ];

  return (
    <section id="datasheet" className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="mb-8">
        <SectionLabel>ENGINEERING DATASHEET</SectionLabel>
        <h2 className="display-wide text-2xl sm:text-4xl font-bold tracking-tight text-foreground mt-1">
          TECHNICAL SPECIFICATIONS.
        </h2>
      </div>

      <div className="panel border border-border bg-card shadow-panel overflow-hidden">
        <div className="divide-y divide-border">
          {specs.map(spec => (
            <div
              key={spec.label}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-6 font-mono text-xs gap-1"
            >
              <span className="text-muted-foreground font-semibold">
                {spec.label}
              </span>
              <span className="text-foreground font-medium sm:text-right">
                {spec.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickstartSection() {
  return (
    <section id="quickstart" className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="mb-8">
        <SectionLabel>LOCAL PROVISIONING</SectionLabel>
        <h2 className="display-wide text-2xl sm:text-4xl font-bold tracking-tight text-foreground mt-1">
          RUN YOUR OWN UNIT.
        </h2>
      </div>

      <div className="panel p-5 border border-border bg-card shadow-panel space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="size-4 text-primary" />
            <span className="font-mono text-xs font-bold text-foreground">
              TERMINAL / DOCKER COMPOSE
            </span>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            BASH
          </span>
        </div>

        {/* Recessed Shell Well */}
        <div className="well p-4 rounded-lg font-mono text-xs text-foreground space-y-2 overflow-x-auto">
          <div className="text-muted-foreground"># 1. Clone repository from GitHub</div>
          <div>git clone https://github.com/naveedkhan1998/realtime-chat-app.git</div>
          <div>cd realtime-chat-app</div>
          <br />
          <div className="text-muted-foreground"># 2. Boot PostgreSQL, Redis, and Django Channels in Docker</div>
          <div>docker compose up -d</div>
          <br />
          <div className="text-muted-foreground"># 3. Start client development server</div>
          <div>npm run dev</div>
        </div>

        <div className="flex items-center justify-between pt-2 font-mono text-xs text-muted-foreground">
          <span>Target client runs at http://localhost:5173</span>
          <a
            href="https://github.com/naveedkhan1998/realtime-chat-app#readme"
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            README.md
            <ExternalLink className="size-3" />
          </a>
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6">
      <div className="panel p-8 sm:p-12 border-2 border-primary/40 bg-card shadow-lift text-center space-y-6 rounded-2xl relative overflow-hidden">
        <div className="screw absolute top-3 left-3" />
        <div className="screw absolute top-3 right-3" />
        <div className="screw absolute bottom-3 left-3" />
        <div className="screw absolute bottom-3 right-3" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-border bg-well font-mono text-2xs text-primary font-bold">
          <Led tone="signal" blink />
          TRANSMISSION READY
        </div>

        <h2 className="display-wide text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
          READY TO ENTER THE CONSOLE?
        </h2>

        <p className="font-mono text-xs sm:text-sm text-muted-foreground max-w-lg mx-auto">
          Open a direct channel or join a live voice huddle. Experience instant messaging engineered with hardware intent.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button
            asChild
            size="lg"
            className="font-mono text-xs sm:text-sm font-bold h-12 px-8 gap-2"
          >
            <Link to="/login">
              INITIALIZE TERMINAL
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
