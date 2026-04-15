import React, { useEffect, useState, useCallback } from 'react';
import { Brackets, Copy, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

import { fetchHostingEnvVariables } from './api';
import type { HostingEnvVariable } from './types';

function maskValue(v: string): string {
  if (!v) return '—';
  if (v.length <= 8) return '••••••••';
  return `${v.slice(0, 2)}${'•'.repeat(Math.min(12, v.length - 4))}${v.slice(-2)}`;
}

function formatEnvFile(vars: HostingEnvVariable[]): string {
  return vars
    .filter((x) => x.key)
    .map((x) => {
      const val = x.value ?? '';
      if (/[\r\n]/.test(val)) {
        return `${x.key}="${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
      }
      if (/[#\s"'=]/.test(val)) {
        return `${x.key}="${val.replace(/"/g, '\\"')}"`;
      }
      return `${x.key}=${val}`;
    })
    .join('\n');
}

function formatLine(v: HostingEnvVariable): string {
  const val = v.value ?? '';
  if (/[\r\n]/.test(val)) {
    return `${v.key}="${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  if (/[#\s"'=]/.test(val)) {
    return `${v.key}="${val.replace(/"/g, '\\"')}"`;
  }
  return `${v.key}=${val}`;
}

export function HostingEnvDialog({
  providerKey,
  serviceId,
  serviceName,
}: {
  providerKey: string;
  serviceId: string;
  serviceName: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variables, setVariables] = useState<HostingEnvVariable[]>([]);
  const [showValues, setShowValues] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchHostingEnvVariables(providerKey, serviceId);
      setVariables(rows);
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      const msg = ax.response?.data?.message;
      setError(msg || 'Failed to load environment variables.');
      setVariables([]);
    } finally {
      setLoading(false);
    }
  }, [providerKey, serviceId]);

  useEffect(() => {
    if (open) {
      void load();
      setShowValues(false);
    }
  }, [open, load]);

  const copyAll = async () => {
    const text = formatEnvFile(variables);
    await navigator.clipboard.writeText(text);
    toast.success('Copied environment block');
  };

  const copyLine = async (v: HostingEnvVariable) => {
    await navigator.clipboard.writeText(formatLine(v));
    toast.success(`Copied ${v.key}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 shrink-0 gap-1.5 px-3 text-xs font-medium border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 hover:text-gray-900"
        onClick={() => setOpen(true)}
      >
        <Brackets className="h-3.5 w-3.5 text-blue-600" aria-hidden />
        Env
      </Button>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-left">Environment variables</DialogTitle>
          <DialogDescription className="text-left">
            {serviceName}
            <span className="text-gray-400"> · {providerKey}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-3 flex flex-wrap items-center gap-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-env-values"
              checked={showValues}
              onCheckedChange={(c) => setShowValues(c === true)}
            />
            <Label htmlFor="show-env-values" className="text-sm font-normal cursor-pointer">
              Show values
            </Label>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={loading || variables.length === 0}
            onClick={() => void copyAll()}
          >
            <Copy className="h-3.5 w-3.5 mr-1.5" />
            Copy app
          </Button>
        </div>

        <p className="px-6 text-[11px] text-gray-500">
          Fetched with your encrypted API token. ServX does not store these values.
        </p>

        <div className="flex-1 overflow-auto px-6 py-4 min-h-[200px]">
          {loading && (
            <div className="flex items-center justify-center gap-2 text-gray-500 py-12">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading…</span>
            </div>
          )}
          {!loading && error && <p className="text-sm text-red-600 py-4">{error}</p>}
          {!loading && !error && variables.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">No variables returned by the provider.</p>
          )}
          {!loading && !error && variables.length > 0 && (
            <ul className="space-y-2 font-mono text-xs">
              {variables.map((v, i) => (
                <li
                  key={`${v.key}-${i}`}
                  className="flex items-start gap-2 rounded-md border border-gray-100 bg-gray-50/80 px-3 py-2 group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-gray-800 font-semibold break-all">{v.key}</div>
                    {v.target ? <div className="text-[10px] text-gray-400 mt-0.5">{v.target}</div> : null}
                    <div className="text-gray-600 mt-1 break-all whitespace-pre-wrap">
                      {showValues ? v.value || '—' : maskValue(v.value)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 opacity-70 group-hover:opacity-100"
                    title="Copy line"
                    onClick={() => void copyLine(v)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
