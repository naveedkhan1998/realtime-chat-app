import { memo, useMemo } from 'react';
import {
  Activity,
  Wifi,
  WifiOff,
  Globe,
  Server,
  Radio,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
  Shield,
  Clock,
  Package,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  LucideIcon,
  Cloud,
  Upload,
  Download,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn, getAvatarUrl } from '@/lib/utils';
import { Led } from '@/components/console';

// ============ TYPES ============
export interface SfuStats {
  publish?: {
    connectionState: string;
    type: string;
    quality: string;
    bitrate: { out: number };
    audio?: {
      packetsSent?: number;
      bytesSent?: number;
    };
    rtt?: number;
  };
  subscribe?: {
    connectionState: string;
    type: string;
    quality: string;
    bitrate: { in: number };
    audio?: {
      packetsReceived?: number;
      bytesReceived?: number;
      jitter?: number;
      packetLossPercent?: number;
    };
    rtt?: number;
  };
  timestamp?: number;
}

export interface WebRTCStatsProps {
  connectionDetails: Record<number, ConnectionDetail>;
  connectedPeers: Array<{ id: number; name: string; avatar: string }>;
  isUsingSfu?: boolean;
  sfuStats?: SfuStats | null;
  scrollable?: boolean;
}

export interface ConnectionDetail {
  type: string;
  connectionPath: string;
  quality: string;
  activePair?: {
    local?: { protocol?: string; candidateType?: string };
    remote?: { candidateType?: string };
    rtt?: number;
  };
  bitrate?: { in: number; out: number };
  audio?: {
    packetLossPercent?: number;
    inbound?: {
      packetsReceived?: number;
      jitter?: number;
      codec?: { mimeType?: string };
    };
    outbound?: { packetsSent?: number };
  };
  candidatePairs?: CandidatePair[];
}

interface CandidatePair {
  id: string;
  state: string;
  selected?: boolean;
  currentRoundTripTime?: number;
  local?: { type?: string; protocol?: string };
  remote?: { type?: string; protocol?: string };
}

// ============ STATIC CONFIGS (outside component to avoid recreation) ============
const QUALITY_CONFIGS = {
  excellent: {
    color: 'text-live',
    bg: 'bg-live/10',
    border: 'border-live/30',
    bars: 4,
    label: 'Excellent',
  },
  good: {
    color: 'text-live',
    bg: 'bg-live/10',
    border: 'border-live/30',
    bars: 3,
    label: 'Good',
  },
  fair: {
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    bars: 2,
    label: 'Fair',
  },
  poor: {
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    bars: 1,
    label: 'Poor',
  },
} as const;

const DEFAULT_QUALITY_CONFIG = {
  color: 'text-muted-foreground',
  bg: 'bg-well/40',
  border: 'border-border',
  bars: 0,
  label: 'Unknown',
};

const STATE_CONFIGS: Record<
  string,
  { icon: LucideIcon; color: string; bg: string }
> = {
  succeeded: {
    icon: CheckCircle2,
    color: 'text-live',
    bg: 'bg-live/10',
  },
  failed: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  'in-progress': {
    icon: CircleDot,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  frozen: { icon: WifiOff, color: 'text-muted-foreground', bg: 'bg-well/40' },
};

const DEFAULT_STATE_CONFIG = {
  icon: CircleDot,
  color: 'text-muted-foreground',
  bg: 'bg-well/40',
};

const BAR_HEIGHTS = ['h-1', 'h-2', 'h-3', 'h-4'] as const;

// ============ MEMOIZED SUB-COMPONENTS ============
const QualityIndicator = memo(({ quality }: { quality: string }) => {
  const config =
    QUALITY_CONFIGS[quality as keyof typeof QUALITY_CONFIGS] ||
    DEFAULT_QUALITY_CONFIG;

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full border',
        config.bg,
        config.border
      )}
    >
      <div className="flex items-end gap-0.5 h-4">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={cn(
              'w-1 rounded-full transition-all',
              i <= config.bars
                ? config.color.replace('text-', 'bg-')
                : 'bg-muted',
              BAR_HEIGHTS[i - 1]
            )}
          />
        ))}
      </div>
      <span className={cn('text-xs font-medium', config.color)}>
        {config.label}
      </span>
    </div>
  );
});
QualityIndicator.displayName = 'QualityIndicator';

const ConnectionPathVisual = memo(
  ({ path, type }: { path: string; type: string }) => {
    const isRelay = path === 'relay';
    const isDirect = path === 'direct';

    return (
      <div className="relative p-4 overflow-hidden border rounded-xl bg-well">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:20px_20px]" />
        </div>

        <div className="relative flex items-center justify-between">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="flex items-center justify-center w-12 h-12 border-2 rounded-xl bg-primary/10 border-primary/30">
                <Radio className="w-5 h-5 text-primary" />
              </div>
              <div className="absolute w-3 h-3 bg-live border-2 rounded-full -bottom-1 -right-1 border-background animate-pulse" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">
              You
            </span>
          </div>

          <div className="relative flex-1 mx-4">
            <div className="absolute inset-y-1/2 left-0 right-0 h-0.5 bg-well" />

            <div className="absolute inset-0 overflow-hidden">
              <div
                className="absolute w-2 h-2 rounded-full top-1/2 -translate-y-1/2 bg-primary animate-[ping_2s_ease-in-out_infinite]"
                style={{ left: '20%' }}
              />
              <div
                className="absolute w-2 h-2 rounded-full top-1/2 -translate-y-1/2 bg-primary animate-[ping_2s_ease-in-out_infinite_0.5s]"
                style={{ left: '50%' }}
              />
              <div
                className="absolute w-2 h-2 rounded-full top-1/2 -translate-y-1/2 bg-primary animate-[ping_2s_ease-in-out_infinite_1s]"
                style={{ left: '80%' }}
              />
            </div>

            {!isDirect && (
              <div className="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2">
                <div
                  className={cn(
                    'flex flex-col items-center gap-1 px-3 py-2 rounded-lg border',
                    isRelay
                      ? 'bg-primary/10 border-primary/30'
                      : 'bg-well border-border'
                  )}
                >
                  {isRelay ? (
                    <Server className="w-4 h-4 text-primary" />
                  ) : (
                    <Globe className="w-4 h-4 text-primary" />
                  )}
                  <span className="text-[9px] font-mono font-semibold uppercase tracking-wider text-foreground">
                    {isRelay ? 'TURN' : 'STUN'}
                  </span>
                </div>
              </div>
            )}

            {isDirect && (
              <div className="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2">
                <div className="flex items-center gap-1 px-2 py-1 border rounded-full bg-live/10 border-live/30">
                  <Zap className="w-3 h-3 text-live" />
                  <span className="text-[9px] font-semibold text-live">
                    DIRECT
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <div className="flex items-center justify-center w-12 h-12 border-2 rounded-xl bg-secondary/50 border-secondary">
                <Radio className="w-5 h-5 text-secondary-foreground" />
              </div>
              <div className="absolute w-3 h-3 bg-live border-2 rounded-full -bottom-1 -right-1 border-background animate-pulse" />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground">
              Peer
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4">
          <Badge variant="outline" className="text-xs">
            {type}
          </Badge>
        </div>
      </div>
    );
  }
);
ConnectionPathVisual.displayName = 'ConnectionPathVisual';

const StatCard = memo(
  ({
    icon: Icon,
    label,
    value,
    subValue,
    color = 'primary',
    pulse = false,
  }: {
    icon: LucideIcon;
    label: string;
    value: string | number;
    subValue?: string;
    color?: string;
    pulse?: boolean;
  }) => (
    <div className="p-3 space-y-2 border rounded-lg bg-well border-border">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'p-1.5 rounded-md',
            color === 'primary' && 'bg-primary/10 text-primary',
            (color === 'green' || color === 'live') && 'bg-live/10 text-live',
            color === 'blue' && 'bg-primary/10 text-primary',
            (color === 'orange' || color === 'signal') && 'bg-primary/15 text-primary',
            (color === 'red' || color === 'destructive') &&
              'bg-destructive/10 text-destructive',
            pulse && 'animate-pulse'
          )}
        >
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="font-mono text-2xs uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-lg font-bold text-foreground">{value}</span>
        {subValue && (
          <span className="font-mono text-xs text-muted-foreground">{subValue}</span>
        )}
      </div>
    </div>
  )
);
StatCard.displayName = 'StatCard';

const BitrateChart = memo(
  ({ inbound, outbound }: { inbound: number; outbound: number }) => {
    const { inPercent, outPercent } = useMemo(() => {
      const maxBitrate = Math.max(inbound, outbound, 100);
      return {
        inPercent: (inbound / maxBitrate) * 100,
        outPercent: (outbound / maxBitrate) * 100,
      };
    }, [inbound, outbound]);

    return (
      <div className="p-4 space-y-4 border rounded-xl bg-well">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="w-4 h-4 text-primary" />
            Live Bitrate
          </h4>
          <Badge variant="secondary" className="text-[10px]">
            <span className="w-1.5 h-1.5 bg-live rounded-full mr-1 animate-pulse" />
            LIVE
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <ArrowDownLeft className="w-3 h-3 text-live" />
                Receiving
              </span>
              <span className="font-mono font-medium">
                {inbound.toFixed(1)} kbps
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-well border border-border/40">
              <div
                className="absolute inset-y-0 left-0 transition-all duration-300 rounded-full bg-live"
                style={{ width: `${inPercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <ArrowUpRight className="w-3 h-3 text-primary" />
                Sending
              </span>
              <span className="font-mono font-medium">
                {outbound.toFixed(1)} kbps
              </span>
            </div>
            <div className="relative h-2 overflow-hidden rounded-full bg-well border border-border/40">
              <div
                className="absolute inset-y-0 left-0 transition-all duration-300 rounded-full bg-primary"
                style={{ width: `${outPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.inbound === next.inbound && prev.outbound === next.outbound
);
BitrateChart.displayName = 'BitrateChart';

const CandidatePairCard = memo(
  ({ pair, isActive }: { pair: CandidatePair; isActive: boolean }) => {
    const stateConfig = STATE_CONFIGS[pair.state] || DEFAULT_STATE_CONFIG;
    const StateIcon = stateConfig.icon;

    return (
      <div
        className={cn(
          'p-3 rounded-lg border transition-all',
          isActive
            ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
            : 'bg-muted/20 border-border/50'
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn('p-1 rounded', stateConfig.bg)}>
              <StateIcon className={cn('w-3 h-3', stateConfig.color)} />
            </div>
            <span
              className={cn('text-xs font-medium uppercase', stateConfig.color)}
            >
              {pair.state}
            </span>
          </div>
          {isActive && (
            <Badge className="text-[9px] bg-primary text-primary-foreground font-mono">
              ACTIVE
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center text-[10px]">
          <div className="space-y-0.5">
            <div className="font-medium text-foreground">Local</div>
            <div className="text-muted-foreground">
              {pair.local?.type} ({pair.local?.protocol?.toUpperCase()})
            </div>
          </div>
          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted">
            <ArrowUpRight className="w-3 h-3" />
          </div>
          <div className="space-y-0.5 text-right">
            <div className="font-medium text-foreground">Remote</div>
            <div className="text-muted-foreground">
              {pair.remote?.type} ({pair.remote?.protocol?.toUpperCase()})
            </div>
          </div>
        </div>

        {pair.currentRoundTripTime && (
          <div className="flex items-center justify-center gap-1 pt-2 mt-2 border-t border-border/50">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              RTT: {(pair.currentRoundTripTime * 1000).toFixed(0)}ms
            </span>
          </div>
        )}
      </div>
    );
  },
  (prev, next) =>
    prev.pair.id === next.pair.id &&
    prev.pair.state === next.pair.state &&
    prev.isActive === next.isActive
);
CandidatePairCard.displayName = 'CandidatePairCard';

// ============ PEER STATS COMPONENT (memoized) ============
interface PeerStatsProps {
  peer: { id: number; name: string; avatar: string };
  details: ConnectionDetail;
  showHeader: boolean;
}

const PeerStats = memo(({ peer, details, showHeader }: PeerStatsProps) => {
  const rtt = details.activePair?.rtt;
  const packetLoss = details.audio?.packetLossPercent || 0;
  const packetsReceived = details.audio?.inbound?.packetsReceived || 0;
  const packetsSent = details.audio?.outbound?.packetsSent || 0;
  const jitter = details.audio?.inbound?.jitter
    ? (details.audio.inbound.jitter * 1000).toFixed(1)
    : null;

  // Memoize the sorted/filtered candidate pairs
  const filteredPairs = useMemo(() => {
    if (!details.candidatePairs?.length) return [];
    return details.candidatePairs
      .filter(
        pair =>
          pair.state === 'succeeded' || pair.state === 'failed' || pair.selected
      )
      .sort((a, b) => {
        if (a.selected && !b.selected) return -1;
        if (!a.selected && b.selected) return 1;
        if (a.state === 'succeeded' && b.state !== 'succeeded') return -1;
        if (a.state !== 'succeeded' && b.state === 'succeeded') return 1;
        return 0;
      })
      .slice(0, 5);
  }, [details.candidatePairs]);

  const succeededCount = useMemo(
    () =>
      details.candidatePairs?.filter(p => p.state === 'succeeded').length || 0,
    [details.candidatePairs]
  );

  // Memoize color calculations
  const rttColor = useMemo(
    () => (rtt && rtt > 150 ? 'signal' : rtt && rtt > 50 ? 'primary' : 'live'),
    [rtt]
  );

  const packetLossColor = useMemo(
    () => (packetLoss > 2 ? 'destructive' : packetLoss > 0.5 ? 'signal' : 'live'),
    [packetLoss]
  );

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center gap-3 pb-3 border-b">
          <Avatar className="w-8 h-8 border-2 border-primary/20">
            <AvatarImage src={getAvatarUrl(peer.avatar)} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {peer.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-sm font-semibold">{peer.name}</h3>
            <p className="text-[10px] text-muted-foreground">Peer Connection</p>
          </div>
          <div className="ml-auto">
            <QualityIndicator quality={details.quality || 'unknown'} />
          </div>
        </div>
      )}

      {!showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-live" />
            <span className="text-sm font-medium">Connection Quality</span>
          </div>
          <QualityIndicator quality={details.quality || 'unknown'} />
        </div>
      )}

      <ConnectionPathVisual
        path={details.connectionPath || 'unknown'}
        type={details.type || 'Unknown'}
      />

      {details.bitrate && (
        <BitrateChart
          inbound={details.bitrate.in}
          outbound={details.bitrate.out}
        />
      )}

      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={Clock}
          label="Latency (RTT)"
          value={rtt ? `${rtt.toFixed(0)}` : 'N/A'}
          subValue={rtt ? 'ms' : undefined}
          color={rttColor}
          pulse={!!rtt}
        />
        <StatCard
          icon={Package}
          label="Packet Loss"
          value={`${packetLoss.toFixed(2)}`}
          subValue="%"
          color={packetLossColor}
        />
        <StatCard
          icon={ArrowDownLeft}
          label="Packets In"
          value={packetsReceived.toLocaleString()}
          color="live"
        />
        <StatCard
          icon={ArrowUpRight}
          label="Packets Out"
          value={packetsSent.toLocaleString()}
          color="primary"
        />
      </div>

      {jitter && (
        <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
          <div className="p-2 rounded-lg bg-well">
            <Activity className="w-4 h-4 text-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Audio Jitter</p>
            <p className="text-sm font-semibold">{jitter} ms</p>
          </div>
        </div>
      )}

      {filteredPairs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <Shield className="w-4 h-4 text-primary" />
              ICE Candidates
            </h4>
            <Badge variant="outline" className="text-[10px]">
              {succeededCount} succeeded
            </Badge>
          </div>
          <div className="space-y-2">
            {filteredPairs.map(pair => (
              <CandidatePairCard
                key={pair.id}
                pair={pair}
                isActive={pair.selected || false}
              />
            ))}
          </div>
        </div>
      )}

      <div className="p-3 space-y-2 border rounded-lg bg-muted/10">
        <h4 className="text-xs font-medium text-muted-foreground">
          Connection Details
        </h4>
        <div className="grid grid-cols-2 text-xs gap-x-4 gap-y-1">
          <span className="text-muted-foreground">Protocol:</span>
          <span className="font-mono font-medium">
            {details.activePair?.local?.protocol?.toUpperCase() || 'N/A'}
          </span>
          <span className="text-muted-foreground">Local Type:</span>
          <span className="font-mono">
            {details.activePair?.local?.candidateType || 'N/A'}
          </span>
          <span className="text-muted-foreground">Remote Type:</span>
          <span className="font-mono">
            {details.activePair?.remote?.candidateType || 'N/A'}
          </span>
          {details.audio?.inbound?.codec && (
            <>
              <span className="text-muted-foreground">Audio Codec:</span>
              <span className="font-mono">
                {details.audio.inbound.codec.mimeType
                  ?.split('/')[1]
                  ?.toUpperCase() || 'N/A'}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});
PeerStats.displayName = 'PeerStats';

// ============ SFU STATS COMPONENT ============
const SfuStatsDisplay = memo(({ sfuStats }: { sfuStats: SfuStats }) => {
  const publishQuality = sfuStats.publish?.quality || 'unknown';
  const subscribeQuality = sfuStats.subscribe?.quality || 'unknown';

  // Overall quality is the worst of the two
  const overallQuality = useMemo(() => {
    const qualityOrder = ['poor', 'fair', 'good', 'excellent'];
    const pubIdx = qualityOrder.indexOf(publishQuality);
    const subIdx = qualityOrder.indexOf(subscribeQuality);
    if (pubIdx === -1 && subIdx === -1) return 'unknown';
    if (pubIdx === -1) return subscribeQuality;
    if (subIdx === -1) return publishQuality;
    return qualityOrder[Math.min(pubIdx, subIdx)];
  }, [publishQuality, subscribeQuality]);

  // const _qualityConfig =
  //   QUALITY_CONFIGS[overallQuality as keyof typeof QUALITY_CONFIGS] ||
  //   DEFAULT_QUALITY_CONFIG;

  return (
    <div className="space-y-6">
      {/* SFU Header */}
      <div className="p-4 border rounded-xl bg-well">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex items-center justify-center w-12 h-12 border-2 rounded-xl bg-primary/10 border-primary/30">
                <Cloud className="w-6 h-6 text-primary" />
              </div>
              <div className="absolute w-3 h-3 bg-live border-2 rounded-full -bottom-1 -right-1 border-background animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Cloudflare SFU</h3>
              <p className="text-xs text-muted-foreground">
                Selective Forwarding Unit
              </p>
            </div>
          </div>
          <QualityIndicator quality={overallQuality} />
        </div>

        {/* Connection Path Visual for SFU */}
        <div className="relative p-4 overflow-hidden border rounded-xl bg-well">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:20px_20px]" />
          </div>

          <div className="relative flex items-center justify-between">
            {/* You */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 border-2 rounded-xl bg-primary/10 border-primary/30">
                  <Radio className="w-5 h-5 text-primary" />
                </div>
                <div className="absolute w-3 h-3 bg-live border-2 rounded-full -bottom-1 -right-1 border-background animate-pulse" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                You
              </span>
            </div>

            {/* Connection line to SFU */}
            <div className="relative flex-1 mx-4">
              <div className="absolute inset-y-1/2 left-0 right-0 h-0.5 bg-well" />
              <div className="absolute inset-0 overflow-hidden">
                <div
                  className="absolute w-2 h-2 rounded-full top-1/2 -translate-y-1/2 bg-primary animate-[ping_2s_ease-in-out_infinite]"
                  style={{ left: '30%' }}
                />
              </div>
            </div>

            {/* SFU Cloud */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 border-2 rounded-xl bg-well border-border">
                  <Cloud className="w-5 h-5 text-foreground" />
                </div>
                <div className="absolute w-3 h-3 bg-live border-2 rounded-full -bottom-1 -right-1 border-background animate-pulse" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                SFU
              </span>
            </div>

            {/* Connection line to peers */}
            <div className="relative flex-1 mx-4">
              <div className="absolute inset-y-1/2 left-0 right-0 h-0.5 bg-well" />
              <div className="absolute inset-0 overflow-hidden">
                <div
                  className="absolute w-2 h-2 rounded-full top-1/2 -translate-y-1/2 bg-live animate-[ping_2s_ease-in-out_infinite_0.5s]"
                  style={{ left: '70%' }}
                />
              </div>
            </div>

            {/* Peers */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="flex items-center justify-center w-12 h-12 border-2 rounded-xl bg-primary/10 border-primary/30">
                  <Server className="w-5 h-5 text-primary" />
                </div>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">
                Peers
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Publish Stats */}
      {sfuStats.publish && (
        <div className="p-4 space-y-4 border rounded-xl bg-card border-border/50">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-live" />
            <h4 className="font-medium text-foreground">Upload (Publish)</h4>
            <Badge variant="outline" className="ml-auto text-xs">
              {sfuStats.publish.connectionState}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={ArrowUpRight}
              label="Bitrate Out"
              value={`${sfuStats.publish.bitrate.out.toFixed(1)} kbps`}
              color="text-live"
            />
            {sfuStats.publish.rtt !== undefined && (
              <StatCard
                icon={Clock}
                label="RTT"
                value={`${sfuStats.publish.rtt.toFixed(0)} ms`}
                color="text-primary"
              />
            )}
            {sfuStats.publish.audio?.packetsSent !== undefined && (
              <StatCard
                icon={Package}
                label="Packets Sent"
                value={sfuStats.publish.audio.packetsSent.toLocaleString()}
                color="text-foreground"
              />
            )}
          </div>
        </div>
      )}

      {/* Subscribe Stats */}
      {sfuStats.subscribe && (
        <div className="p-4 space-y-4 border rounded-xl bg-card border-border/50">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-foreground">
              Download (Subscribe)
            </h4>
            <Badge variant="outline" className="ml-auto text-xs">
              {sfuStats.subscribe.connectionState}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={ArrowDownLeft}
              label="Bitrate In"
              value={`${sfuStats.subscribe.bitrate.in.toFixed(1)} kbps`}
              color="text-primary"
            />
            {sfuStats.subscribe.rtt !== undefined && (
              <StatCard
                icon={Clock}
                label="RTT"
                value={`${sfuStats.subscribe.rtt.toFixed(0)} ms`}
                color="text-primary"
              />
            )}
            {sfuStats.subscribe.audio?.packetsReceived !== undefined && (
              <StatCard
                icon={Package}
                label="Packets Received"
                value={sfuStats.subscribe.audio.packetsReceived.toLocaleString()}
                color="text-foreground"
              />
            )}
            {sfuStats.subscribe.audio?.packetLossPercent !== undefined && (
              <StatCard
                icon={AlertTriangle}
                label="Packet Loss"
                value={`${sfuStats.subscribe.audio.packetLossPercent.toFixed(2)}%`}
                color={
                  sfuStats.subscribe.audio.packetLossPercent > 2
                    ? 'text-destructive'
                    : 'text-live'
                }
              />
            )}
            {sfuStats.subscribe.audio?.jitter !== undefined && (
              <StatCard
                icon={Activity}
                label="Jitter"
                value={`${(sfuStats.subscribe.audio.jitter * 1000).toFixed(1)} ms`}
                color="text-primary"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
});
SfuStatsDisplay.displayName = 'SfuStatsDisplay';

// ============ MAIN COMPONENT ============
function WebRTCStats({
  connectionDetails,
  connectedPeers,
  isUsingSfu = false,
  sfuStats,
  scrollable = true,
}: WebRTCStatsProps) {
  // Early return for no connections - memoized console empty state
  const emptyState = useMemo(
    () => (
      <div className="flex flex-col items-center justify-center py-8 px-2 text-center space-y-4">
        {/* Amber LCD Carrier Standby */}
        <div className="w-full max-w-md lcd p-4 rounded-xl space-y-2 text-left">
          <div className="flex items-center justify-between font-mono text-2xs text-primary/80 border-b border-primary/20 pb-1">
            <span>VOX·CARRIER STANDBY</span>
            <span className="flex items-center gap-1.5 font-bold">
              <span className="size-1.5 rounded-full bg-primary animate-pulse" />
              POLLING
            </span>
          </div>
          <div className="space-y-1 font-mono text-xs text-primary">
            <div>&gt; LOCAL TRANSCEIVER ENGAGED</div>
            <div>&gt; CODEC: OPUS 48 kHz STEREO FULLBAND</div>
            <div>&gt; AWAITING INBOUND PEER AUDIO STREAMS...</div>
          </div>
          <div className="pt-2 flex items-center justify-between text-2xs font-mono text-primary/70 border-t border-primary/20">
            <span>DTLS 1.2 / SRTP ENCRYPTED</span>
            <span>TOPOLOGY: {isUsingSfu ? 'SFU RELAY' : 'PEER MESH'}</span>
          </div>
        </div>

        <div className="font-mono text-xs text-muted-foreground flex items-center gap-2">
          <Led tone="signal" blink />
          <span>Listening for inbound audio packets on active frequency</span>
        </div>
      </div>
    ),
    [isUsingSfu]
  );

  // SFU mode: show SFU stats
  if (isUsingSfu && sfuStats && (sfuStats.publish || sfuStats.subscribe)) {
    const content = <SfuStatsDisplay sfuStats={sfuStats} />;

    if (scrollable) {
      return <ScrollArea className="max-h-[70vh] pr-4">{content}</ScrollArea>;
    }
    return content;
  }

  // P2P mode: show per-peer stats (filter for peers that have active connection data)
  const activePeers = connectedPeers.filter(peer => !!connectionDetails[peer.id]);

  if (activePeers.length === 0) {
    return emptyState;
  }

  const showMultiplePeerHeaders = activePeers.length > 1;

  const content = (
    <div className="space-y-6">
      {activePeers.map(peer => {
        const details = connectionDetails[peer.id];
        return (
          <PeerStats
            key={peer.id}
            peer={peer}
            details={details}
            showHeader={showMultiplePeerHeaders}
          />
        );
      })}
    </div>
  );

  if (scrollable) {
    return <ScrollArea className="max-h-[70vh] pr-4">{content}</ScrollArea>;
  }

  return content;
}

export default memo(WebRTCStats);
