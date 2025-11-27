import React, { useEffect, useState } from 'react';
import { useHealthCheckQuery } from '@/services/baseApi';
import { setError } from '@/features/errorSlice';
import { WifiOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HealthCheckProps {
  children: React.ReactNode;
}

const loadingMessages = [
  'Warming up the engines...',
  'Brewing some coffee for the servers...',
  'Untangling the cables...',
  'Waking up the hamsters...',
  'Charging the flux capacitor...',
  'Aligning the planets...',
];

export default function HealthCheck({ children }: HealthCheckProps) {
  const { isLoading, isError, refetch } = useHealthCheckQuery();
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(loadingMessages[0]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let messageIntervalId: NodeJS.Timeout;

    if (isLoading || isError) {
      setIsBackendReady(false);
      // Retry logic - poll frequently when down
      intervalId = setInterval(() => {
        refetch();
      }, 5000);

      // Change message every 5 seconds
      messageIntervalId = setInterval(() => {
        setCurrentMessage(
          loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
        );
      }, 5000);
    } else {
      // Backend is up
      setIsBackendReady(true);
      // Poll less frequently when up
      intervalId = setInterval(() => {
        refetch();
      }, 60000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (messageIntervalId) clearInterval(messageIntervalId);
    };
  }, [isLoading, isError, refetch]);

  useEffect(() => {
    if (isBackendReady && isError) {
      setError('Connection to the server lost. Please try again later.');
    }
  }, [isBackendReady, isError]);

  return (
    <>
      {children}
      <AnimatePresence>
        {(!isBackendReady || isError) && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-4 right-4 z-50 w-[calc(100%-2rem)] md:w-auto md:max-w-sm"
          >
            <div className="flex items-center gap-4 p-4 border shadow-2xl bg-background/80 backdrop-blur-md rounded-2xl border-primary/20 ring-1 ring-primary/10">
              <div className="relative flex items-center justify-center shrink-0">
                {isError ? (
                  <div className="p-2 rounded-full bg-destructive/10 text-destructive">
                    <WifiOff className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="p-2 rounded-full bg-primary/10 text-primary">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}
                {!isError && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-primary/20" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">
                  {isError ? 'Connection Issue' : 'Waking up server...'}
                </h3>
                <p className="text-xs text-muted-foreground truncate">
                  {isError
                    ? 'Retrying connection...'
                    : 'Free tier cold start (approx. 1 min)'}
                </p>
              </div>
            </div>

            {!isError && (
              <motion.p
                key={currentMessage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-2 text-[10px] text-center text-muted-foreground/70"
              >
                {currentMessage}
              </motion.p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
