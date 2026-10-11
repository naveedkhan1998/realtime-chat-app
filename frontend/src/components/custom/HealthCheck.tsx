import React, { useEffect, useState } from 'react';
import { useHealthCheckQuery } from '@/services/baseApi';
import { setError } from '@/features/errorSlice';
import { WifiOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Led } from '@/components/console';

interface HealthCheckProps {
  children: React.ReactNode;
}

const bootLogs = [
  'COLD START · INITIALIZING ASGI RUNTIME...',
  'SPINNING UP REDIS PUB/SUB CHANNEL LAYER...',
  'WARMING POSTGRES CONNECTION POOL...',
  'CALIBRATING WEBRTC SIGNALING ROUTER...',
  'STABILIZING STATION GATEWAY...',
];

export default function HealthCheck({ children }: HealthCheckProps) {
  const { isLoading, isError, refetch } = useHealthCheckQuery();
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [logIndex, setLogIndex] = useState(0);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let logIntervalId: NodeJS.Timeout;

    if (isLoading || isError) {
      setIsBackendReady(false);
      intervalId = setInterval(() => {
        refetch();
      }, 5000);

      logIntervalId = setInterval(() => {
        setLogIndex(prev => (prev + 1) % bootLogs.length);
      }, 4000);
    } else {
      setIsBackendReady(true);
      intervalId = setInterval(() => {
        refetch();
      }, 60000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (logIntervalId) clearInterval(logIntervalId);
    };
  }, [isLoading, isError, refetch]);

  useEffect(() => {
    if (isBackendReady && isError) {
      setError('Connection to station lost. Reconnecting...');
    }
  }, [isBackendReady, isError]);

  return (
    <>
      {children}
      <AnimatePresence>
        {(!isBackendReady || isError) && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] sm:w-auto sm:max-w-md"
          >
            <div className="panel p-3.5 shadow-lift border border-border bg-card">
              {/* Hardware Strip Header */}
              <div className="flex items-center justify-between gap-3 border-b border-border pb-2.5 mb-2.5">
                <div className="flex items-center gap-2">
                  <Led tone={isError ? 'danger' : 'signal'} blink />
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                    {isError ? 'CARRIER LOST' : 'GATEWAY BOOT'}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-muted-foreground">
                  STATUS·{isError ? 'OFFLINE' : 'POLLING'}
                </span>
              </div>

              {/* LCD Diagnostic readout */}
              <div className="lcd p-2.5 rounded text-xs space-y-1">
                <div className="flex items-center justify-between font-mono text-[10px] text-primary/80 border-b border-primary/20 pb-1">
                  <span>BACKEND HOST</span>
                  <span>RENDER CLOUD</span>
                </div>

                <div className="flex items-center gap-2 pt-1 font-mono text-xs text-primary">
                  {isError ? (
                    <WifiOff className="size-3.5 shrink-0 text-primary" />
                  ) : (
                    <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
                  )}
                  <span className="truncate">
                    {isError
                      ? 'GATEWAY UNREACHABLE · RETRYING...'
                      : bootLogs[logIndex]}
                  </span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-2 text-center font-mono text-[10px] text-muted-foreground/70">
                {isError
                  ? 'Auto-reconnecting every 5s'
                  : 'Free-tier spinup: approx. 45-60s on first request'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
