"use client";

import React, { useEffect, useState } from "react";
import { useHealthCheckQuery } from "@/services/baseApi";
import { setError } from "@/features/errorSlice";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface HealthCheckProps {
  children: React.ReactNode;
}

export default function HealthCheck({ children }: HealthCheckProps) {
  const { isLoading, isError, refetch } = useHealthCheckQuery();
  const [backendUp, setBackendUp] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 12; // 1 minute (5 seconds * 12)

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isLoading) {
      // Initial health check is in progress
    } else if (isError && !backendUp) {
      // Backend is not up yet; retry every 5 seconds
      intervalId = setInterval(() => {
        refetch();
        setRetryCount((prevCount) => prevCount + 1);
      }, 5000);
    } else if (!isError) {
      // Backend is up
      setBackendUp(true);
      setRetryCount(0);
      intervalId = setInterval(() => {
        refetch();
      }, 120000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isLoading, isError, backendUp, refetch]);

  useEffect(() => {
    if (backendUp && isError) {
      setError("Connection to the server lost. Please try again later.");
    }
  }, [backendUp, isError]);

  if (isLoading || (isError && !backendUp)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <Alert className="max-w-md">
          <AlertTitle>Starting up backend server</AlertTitle>
          <AlertDescription>
            {retryCount >= maxRetries ? (
              "Unable to connect to the server. Please refresh the page or try again later."
            ) : (
              <>
                Please wait while we establish a connection.
                <Progress value={(retryCount / maxRetries) * 100} className="mt-2" />
              </>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Backend is up; render the application
  return <>{children}</>;
}
