import React, { useEffect, useState, ReactNode } from 'react';
import { ServXContext } from './useServX';

export interface ServXProviderProps {
  /**
   * The unique PIN generated from the ServX Operations Dashboard.
   */
  projectKey: string;
  
  /**
   * Your application components.
   */
  children: ReactNode;

  /**
   * If true, it bypasses the default full-screen maintenance takeover UI, 
   * allowing you to use `useServX()` to build your own custom fallback.
   */
  customFallback?: boolean;

  /**
   * Optional base API URL. Defaults to the official ServX production API.
   */
  baseUrl?: string;
  
  /**
   * Interval to poll the backend for changes in milliseconds. Defaults to 15000 (15 seconds).
   */
  pollingIntervalMs?: number;
}

/**
 * The core ServX Provider wrapper.
 * Places a protective shell around your application to listen for Remote Kill Switch toggles.
 */
export function ServXProvider({ 
  projectKey, 
  children, 
  customFallback = false,
  baseUrl = 'https://api.servx.dev', // Fallback to your production domain
  pollingIntervalMs = 15000
}: ServXProviderProps) {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (!projectKey) {
      console.warn('[ServX] Warning: No projectKey provided to ServXProvider. Maintenance checks are disabled.');
      setIsChecking(false);
      return;
    }

    let intervalId: ReturnType<typeof setInterval>;

    const checkStatus = async () => {
      try {
        // Fetch the public maintenance status mapped to this unique PIN
        const res = await fetch(`${baseUrl}/api/repositories/sdk/${projectKey}/status`, {
          // Ensure we bypass cache entirely to get the instant toggle state
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          // Assume backend returns { isMaintenance: boolean }
          setIsMaintenance(!!data.isMaintenance);
        }
      } catch (err: any) {
        // Silently fail in production to avoid crashing user applications
        // if the ServX network is experiencing latency.
        if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
          // Stop polling if the server is completely unreachable (e.g. localhost down)
          if (intervalId) clearInterval(intervalId);
          console.warn('[ServX] Backend unreachable. Polling suspended.');
        } else {
          console.warn('[ServX] Polling sync degraded, maintaining previous operational state.');
        }
      } finally {
        setIsChecking(false);
      }
    };

    // Initial immediate check
    checkStatus();

    // Setup polling for dynamic live-updates
    intervalId = setInterval(checkStatus, pollingIntervalMs);

    // Pause polling while the tab is hidden/backgrounded to save bandwidth
    // and battery, and immediately re-check when it becomes visible again so
    // the maintenance state is never stale for longer than necessary.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (intervalId) clearInterval(intervalId);
      } else {
        checkStatus();
        intervalId = setInterval(checkStatus, pollingIntervalMs);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [projectKey, baseUrl, pollingIntervalMs]);

  // If the user opted to handle the UI themselves, we just provide the state context
  if (customFallback) {
    return (
      <ServXContext.Provider value={{ isMaintenance, isChecking }}>
        {children}
      </ServXContext.Provider>
    );
  }

  // If maintenance is triggered and we use default fallback, render the hard block UI
  if (isMaintenance) {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#0f172a', // Tailwind slate-900
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        zIndex: 9999999,
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '3rem 2rem',
          borderRadius: '1.5rem',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          {/* Animated pulsing icon effect */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '4rem',
            height: '4rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            marginBottom: '1.5rem',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
              <line x1="12" y1="2" x2="12" y2="12"></line>
            </svg>
          </div>
          <h1 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.025em' }}>
            System Under Maintenance
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6 }}>
            Our platform is temporarily offline for scheduled infrastructure upgrades. 
            We apologize for any inconvenience. Services will resume shortly.
          </p>
        </div>
      </div>
    );
  }

  // Normal rendering
  return (
    <ServXContext.Provider value={{ isMaintenance, isChecking }}>
      {children}
    </ServXContext.Provider>
  );
}
