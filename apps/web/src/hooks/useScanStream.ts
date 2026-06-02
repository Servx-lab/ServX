import { useState, useCallback, useRef } from 'react';

export interface Finding {
  id: string;
  scanner: 'sast' | 'secret' | 'sca' | 'iac' | 'dast';
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  description: string;
  remediation?: string;
  file?: string;
  line?: number;
  cve?: string;
  cwe?: string[];
  evidence?: string;
  timestamp: string;
}

export type ScannerType = 'sast' | 'secret' | 'sca' | 'iac' | 'dast';

export interface ScannerStatus {
  status: 'idle' | 'scanning' | 'done' | 'failed';
  findingsCount: number;
}

interface UseScanStreamProps {
  onFinding?: (finding: Finding) => void;
  onScannerStart?: (scanner: ScannerType) => void;
  onScannerDone?: (scanner: ScannerType, count: number) => void;
  onError?: (msg: string) => void;
  onComplete?: () => void;
}

export interface StartScanOptions {
  /** Optional manual DAST target URL override. Only used for repo scans.
   *  If not provided, the backend auto-discovers the deployment URL from GitHub Deployments API. */
  dastUrl?: string;
  scanRepo?: boolean;
  scanDast?: boolean;
}

export function useScanStream({
  onFinding,
  onScannerStart,
  onScannerDone,
  onError,
  onComplete,
}: UseScanStreamProps = {}) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopScan = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startScan = useCallback(
    async (target: string, type: 'repo' | 'url', options?: StartScanOptions) => {
      setIsScanning(true);
      setError(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        // Resolve Supabase session JWT for Authorization header
        let token = '';
        try {
          const { supabase } = await import('../lib/supabase');
          const { data: { session } } = await supabase.auth.getSession();
          token = session?.access_token || '';
        } catch (authErr) {
          console.warn('[useScanStream] Failed to resolve supabase session token:', authErr);
        }

        const rawUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
        const base = rawUrl.trim().replace(/\/+$/, '');
        const apiPrefix = base ? (/\/api$/i.test(base) ? base : `${base}/api`) : '/api';
        const scanUrl = `${apiPrefix}/security/scan`;

        console.log(`[useScanStream] Starting SSE stream → ${scanUrl} [type=${type}]`);

        const response = await fetch(scanUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify({
            target,
            type,
            ...(options?.dastUrl ? { dastUrl: options.dastUrl } : {}),
            scanRepo: options?.scanRepo,
            scanDast: options?.scanDast,
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          const text = await response.text();
          let parsedError = 'Failed to initiate security scan';
          try {
            const errObj = JSON.parse(text);
            parsedError = errObj.error || errObj.message || parsedError;
          } catch {
            parsedError = text || parsedError;
          }
          throw new Error(parsedError);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Readable stream not supported by the server response.');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        // Track the current SSE event type so data: lines are dispatched correctly
        let currentEventType: string | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Keep last (potentially partial) line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();

            // Blank line resets the current event (SSE message boundary)
            if (!trimmed) {
              currentEventType = null;
              continue;
            }

            // Track event type from `event: <type>` field
            if (trimmed.startsWith('event: ')) {
              currentEventType = trimmed.substring(7).trim();
              continue;
            }

            // Process data payload using the tracked event type
            if (trimmed.startsWith('data: ')) {
              const dataStr = trimmed.substring(6).trim();
              try {
                const parsed = JSON.parse(dataStr);
                const eventType = currentEventType;

                switch (eventType) {
                  case 'finding':
                    if (onFinding) onFinding(parsed as Finding);
                    break;

                  case 'scanner:start':
                    if (onScannerStart && parsed.scanner) {
                      onScannerStart(parsed.scanner as ScannerType);
                    }
                    break;

                  case 'scanner:done':
                    if (onScannerDone && parsed.scanner) {
                      onScannerDone(parsed.scanner as ScannerType, parsed.findingsCount ?? 0);
                    }
                    break;

                  case 'error':
                    setError(parsed.message || 'Unknown scan error');
                    if (onError) onError(parsed.message || 'Unknown scan error');
                    break;

                  case 'scan:complete':
                    // Stream will end naturally; onComplete fires in finally block
                    break;

                  default:
                    // Fallback: try structural detection for servers without explicit event types
                    if (parsed.scanner && parsed.id && parsed.title) {
                      if (onFinding) onFinding(parsed as Finding);
                    } else if (parsed.scanner && parsed.findingsCount !== undefined) {
                      if (onScannerDone) onScannerDone(parsed.scanner, parsed.findingsCount);
                    } else if (parsed.scanner) {
                      if (onScannerStart) onScannerStart(parsed.scanner);
                    } else if (parsed.message) {
                      setError(parsed.message);
                      if (onError) onError(parsed.message);
                    }
                    break;
                }
              } catch (parseErr) {
                console.warn('[useScanStream] JSON parse failed for line:', trimmed, parseErr);
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.log('[useScanStream] Scan aborted by user.');
        } else {
          console.error('[useScanStream] Stream error:', err.message);
          setError(err.message);
          if (onError) onError(err.message);
        }
      } finally {
        setIsScanning(false);
        abortControllerRef.current = null;
        if (onComplete) onComplete();
      }
    },
    [onFinding, onScannerStart, onScannerDone, onError, onComplete]
  );

  return {
    startScan,
    stopScan,
    isScanning,
    error,
  };
}
