import React, { useEffect, useState } from "react";
import { useHealthCheckQuery } from "@/services/baseApi";
import { setError } from "@/features/errorSlice";

export default function HealthCheck({ children }: { children: React.ReactNode }) {
  const { isLoading, isError, refetch } = useHealthCheckQuery();
  const [backendUp, setBackendUp] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isLoading) {
      // Initial health check is in progress
    } else if (isError && !backendUp) {
      // Backend is not up yet; retry every 5 seconds
      intervalId = setInterval(() => {
        refetch();
      }, 5000);
    } else if (!isError) {
      // Backend is up
      if (!backendUp) {
        setBackendUp(true);
      }
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
      <div className="flex items-center justify-center min-h-screen">
        <p>Starting up backend server.</p>
      </div>
    );
  }

  // Backend is up; render the application
  return <>{children}</>;
}
