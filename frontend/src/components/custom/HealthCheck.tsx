import React, { useEffect, useState } from 'react';
import { useHealthCheckQuery } from '@/services/baseApi';
import { setError } from '@/features/errorSlice';
import { AlertCircle, Server } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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

const funFacts = [
  'Did you know? The first computer bug was an actual bug - a moth trapped in a relay.',
  "The term 'bug' in computer science was coined by Grace Hopper in 1947.",
  'The first computer mouse was made of wood.',
  'The first website is still online at info.cern.ch.',
  "The most common password is '123456'. Please don't use it!",
];

export default function HealthCheck({ children }: HealthCheckProps) {
  const { isLoading, isError, refetch } = useHealthCheckQuery();
  const [backendUp, setBackendUp] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(loadingMessages[0]);
  const [currentFact, setCurrentFact] = useState(funFacts[0]);
  const maxRetries = 12; // 1 minute (5 seconds * 12)

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let messageIntervalId: NodeJS.Timeout;
    let factIntervalId: NodeJS.Timeout;

    if (isLoading || (isError && !backendUp)) {
      // Retry logic
      intervalId = setInterval(() => {
        refetch();
        setRetryCount(prevCount => prevCount + 1);
      }, 5000);

      // Change message every 5 seconds
      messageIntervalId = setInterval(() => {
        setCurrentMessage(
          loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
        );
      }, 5000);

      // Change fun fact every 10 seconds
      factIntervalId = setInterval(() => {
        setCurrentFact(funFacts[Math.floor(Math.random() * funFacts.length)]);
      }, 10000);
    } else if (!isError) {
      // Backend is up
      setBackendUp(true);
      setRetryCount(0);
      intervalId = setInterval(() => {
        refetch();
      }, 120000);
    }

    return () => {
      [intervalId, messageIntervalId, factIntervalId].forEach(
        id => id && clearInterval(id)
      );
    };
  }, [isLoading, isError, backendUp, refetch]);

  useEffect(() => {
    if (backendUp && isError) {
      setError('Connection to the server lost. Please try again later.');
    }
  }, [backendUp, isError]);

  if (isLoading || (isError && !backendUp)) {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen p-4 overflow-hidden bg-background">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px] dark:bg-grid-black/[0.02]" />
        <div className="absolute h-full w-full bg-background [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="p-8 shadow-2xl glass-card rounded-2xl border-primary/10">
            {/* Header */}
            <div className="flex flex-col items-center mb-8 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/60 animate-ping" />
                <div className="relative p-4 rounded-full bg-primary/10 ring-1 ring-primary/20">
                  <Server className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  System Initialization
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Establishing secure connection to server
                </p>
              </div>
            </div>

            {/* Progress Section */}
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-medium tracking-wider uppercase text-muted-foreground">
                  <span>Status</span>
                  <span>
                    {Math.min(Math.round((retryCount / maxRetries) * 100), 100)}
                    %
                  </span>
                </div>
                <Progress
                  value={Math.min((retryCount / maxRetries) * 100, 100)}
                  className="h-1.5 bg-secondary"
                />
              </div>

              {/* Rotating Messages */}
              <div className="flex items-center justify-center h-12">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={currentMessage}
                    initial={{ y: 5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -5, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm font-medium text-center text-primary/80"
                  >
                    {currentMessage}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            {/* Error State (if retrying) */}
            {retryCount >= maxRetries && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 p-3 mt-6 border rounded-lg bg-destructive/10 border-destructive/20"
              >
                <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                <p className="text-sm font-medium text-destructive">
                  Connection timeout. Please refresh the page.
                </p>
              </motion.div>
            )}

            {/* Divider */}
            <div className="h-px my-6 bg-border/50" />

            {/* Fun Fact */}
            <div className="p-4 border bg-secondary/50 rounded-xl border-border/50">
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold tracking-wider uppercase text-primary">
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary" />
                Did you know?
              </div>
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentFact}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-sm leading-relaxed text-muted-foreground"
                >
                  {currentFact}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-xs text-center text-muted-foreground/50">
            Secured by End-to-End Encryption
          </p>
        </motion.div>
      </div>
    );
  }

  // Backend is up; render the application
  return <>{children}</>;
}
