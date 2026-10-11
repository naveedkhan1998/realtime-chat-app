import LoginRegistration from '@/components/custom/LoginRegistration';
import { Helmet } from 'react-helmet-async';
import { BrandMark } from '@/components/console/BrandMark';
import { Led, LcdClock, LevelMeter } from '@/components/console';
import { ShieldCheck, Radio, Server, Cpu } from 'lucide-react';

export default function LoginPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      <Helmet>
        <title>Terminal Access | MNK Chat</title>
        <meta
          name="description"
          content="Operator terminal sign-in and registration for MNK Chat Console."
        />
      </Helmet>

      {/* Left Column - Console Status & Instrument Deck */}
      <div className="lg:col-span-6 panel p-6 sm:p-8 border-2 border-border bg-card shadow-panel rounded-2xl flex flex-col justify-between relative overflow-hidden">
        <div className="screw absolute top-3 left-3" />
        <div className="screw absolute top-3 right-3" />
        <div className="screw absolute bottom-3 left-3" />
        <div className="screw absolute bottom-3 right-3" />

        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <BrandMark size={36} wordmark />
            <div className="flex items-center gap-2 font-mono text-2xs">
              <span className="text-muted-foreground">GATEWAY</span>
              <Led tone="live" blink />
            </div>
          </div>

          {/* Amber LCD Telemetry Readout */}
          <div className="lcd p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between font-mono text-2xs text-primary/80 border-b border-primary/20 pb-1.5">
              <span>SEC·NET: ENCRYPTED</span>
              <LcdClock />
            </div>

            <div className="space-y-1 font-mono text-xs text-primary">
              <div className="font-bold tracking-wider">
                &gt; AWAITING OPERATOR CREDENTIALS
              </div>
              <div className="text-2xs opacity-80">
                &gt; CARRIER: SECURE WEBSOCKET [WSS]
              </div>
              <div className="text-2xs opacity-80">
                &gt; PROTOCOL: DJANGO CHANNELS / ASGI
              </div>
            </div>

            <div className="pt-1 flex items-center gap-2">
              <span className="font-mono text-[9px] text-primary/70">SIG</span>
              <div className="flex-1">
                <LevelMeter level={0.85} bars={14} />
              </div>
            </div>
          </div>

          {/* Instrument Specs */}
          <div className="space-y-2 pt-2">
            <div className="font-mono text-2xs text-muted-foreground uppercase font-bold tracking-wider">
              TELEMETRY SPECIFICATIONS
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-2xs">
              <div className="p-2.5 rounded-lg border border-border bg-well flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-primary shrink-0" />
                <span className="text-muted-foreground truncate">TLS 1.3 CIPHER</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-well flex items-center gap-2">
                <Radio className="size-3.5 text-live shrink-0" />
                <span className="text-muted-foreground truncate">OPUS 48 kHz VOX</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-well flex items-center gap-2">
                <Server className="size-3.5 text-foreground shrink-0" />
                <span className="text-muted-foreground truncate">REDIS PUB/SUB</span>
              </div>
              <div className="p-2.5 rounded-lg border border-border bg-well flex items-center gap-2">
                <Cpu className="size-3.5 text-foreground shrink-0" />
                <span className="text-muted-foreground truncate">REACT 18 VIRT</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Speaker Grille & Station Tag */}
        <div className="pt-6 mt-6 border-t border-border flex items-center justify-between">
          <div className="grille h-8 w-28 rounded border border-border" />
          <span className="font-mono text-2xs text-muted-foreground">
            TERMINAL MODEL RT-2
          </span>
        </div>
      </div>

      {/* Right Column - Authentication Module */}
      <div className="lg:col-span-6 panel p-6 sm:p-8 border-2 border-border bg-card shadow-panel rounded-2xl flex flex-col justify-center relative">
        <div className="screw absolute top-3 left-3" />
        <div className="screw absolute top-3 right-3" />
        <div className="screw absolute bottom-3 left-3" />
        <div className="screw absolute bottom-3 right-3" />

        <div className="mb-6">
          <div className="label-engraved text-primary font-bold mb-1">
            &sect;00 / ACCESS AUTHORIZATION
          </div>
          <h2 className="display-wide text-2xl font-bold tracking-tight text-foreground">
            OPERATOR ENTRY
          </h2>
          <p className="font-mono text-xs text-muted-foreground mt-1">
            Authorize credentials to tune into station channels and voice huddles
          </p>
        </div>

        <LoginRegistration />
      </div>
    </div>
  );
}
