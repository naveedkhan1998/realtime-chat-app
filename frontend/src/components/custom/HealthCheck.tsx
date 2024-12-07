import React, { useEffect, useState } from "react";
import { useHealthCheckQuery } from "@/services/baseApi";
import { setError } from "@/features/errorSlice";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

interface HealthCheckProps {
  children: React.ReactNode;
}

const loadingMessages = [
  "Warming up the engines...",
  "Brewing some coffee for the servers...",
  "Untangling the cables...",
  "Waking up the hamsters...",
  "Charging the flux capacitor...",
  "Aligning the planets...",
];

const funFacts = [
  "Did you know? The first computer bug was an actual bug - a moth trapped in a relay.",
  "The term 'bug' in computer science was coined by Grace Hopper in 1947.",
  "The first computer mouse was made of wood.",
  "The first website is still online at info.cern.ch.",
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
        setRetryCount((prevCount) => prevCount + 1);
      }, 5000);

      // Change message every 5 seconds
      messageIntervalId = setInterval(() => {
        setCurrentMessage(loadingMessages[Math.floor(Math.random() * loadingMessages.length)]);
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
      [intervalId, messageIntervalId, factIntervalId].forEach((id) => id && clearInterval(id));
    };
  }, [isLoading, isError, backendUp, refetch]);

  useEffect(() => {
    if (backendUp && isError) {
      setError("Connection to the server lost. Please try again later.");
    }
  }, [backendUp, isError]);

  if (isLoading || (isError && !backendUp)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} className="w-full max-w-md">
          <Alert className="mb-4 bg-white dark:bg-gray-800 border-primary/20">
            <AlertCircle className="w-4 h-4 text-primary" />
            <AlertTitle className="font-semibold text-primary">Starting up backend server</AlertTitle>
            <AlertDescription>
              {retryCount >= maxRetries ? (
                "Unable to connect to the server. Please refresh the page or try again later."
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentMessage}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-gray-600 dark:text-gray-300"
                  >
                    {currentMessage}
                  </motion.div>
                </AnimatePresence>
              )}
            </AlertDescription>
          </Alert>

          <div className="p-6 bg-white rounded-lg shadow-lg dark:bg-gray-800">
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-primary dark:text-primary-foreground">Loading progress</span>
                <span className="text-sm font-medium text-primary dark:text-primary-foreground">{Math.min(Math.round((retryCount / maxRetries) * 100), 100)}%</span>
              </div>
              <Progress value={Math.min((retryCount / maxRetries) * 100, 100)} className="h-2" />
            </div>

            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <svg className="w-10 h-10 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentFact}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-sm text-center text-gray-600 dark:text-gray-300"
              >
                <span className="font-semibold">Fun Fact:</span> {currentFact}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    );
  }

  // Backend is up; render the application
  return <>{children}</>;
}
