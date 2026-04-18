import React from 'react';
import { Globe, Key, Loader2, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ProviderConfig } from '../types';

interface ConnectionFormProps {
  config: ProviderConfig;
  tokenInput: string;
  setTokenInput: (val: string) => void;
  urlInput: string;
  setUrlInput: (val: string) => void;
  showToken: boolean;
  setShowToken: (val: boolean) => void;
  status: string;
  setStatus: (val: any) => void;
  errorMsg: string;
  handleConnect: () => Promise<void>;
}

export const ConnectionForm: React.FC<ConnectionFormProps> = ({
  config,
  tokenInput,
  setTokenInput,
  urlInput,
  setUrlInput,
  showToken,
  setShowToken,
  status,
  setStatus,
  errorMsg,
  handleConnect
}) => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white min-h-[calc(100vh-12rem)]">
      <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px]" />
      <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-blue-500/5 blur-[100px]" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 h-full min-h-[calc(100vh-12rem)]">
        {/* LEFT: 1/3 — Token input */}
        <div className="lg:col-span-1 flex flex-col justify-center p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-gray-200">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">{config.logoSmall}</div>
              <div>
                <h3 className="text-lg font-semibold text-black">Connect {config.label}</h3>
                <p className="text-xs text-gray-500">{config.tokenLabel}</p>
              </div>
            </div>

            <div className="space-y-4">
              {config.key === 'coolify' && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Instance URL</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="url"
                      placeholder="https://app.coolify.io"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="bg-white border-gray-200 text-black placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/20 pl-10 h-11"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">{config.tokenLabel}</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type={showToken ? 'text' : 'password'}
                    placeholder={config.placeholder}
                    value={tokenInput}
                    onChange={(e) => { setTokenInput(e.target.value); if (status === 'error') setStatus('idle'); }}
                    className="bg-white border-gray-200 text-black placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/20 pl-10 pr-10 h-11"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleConnect}
              disabled={status === 'connecting'}
              className="w-full h-11 relative overflow-hidden transition-all duration-300 bg-blue-500 hover:bg-blue-600 text-white font-semibold shadow-sm"
            >
              {status === 'connecting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Connect {config.label}
            </Button>

            {errorMsg && status === 'error' && <p className="text-xs text-red-500">{errorMsg}</p>}

            <div className="flex items-center justify-center pt-1">
              {status === 'idle' && (
                <Badge variant="outline" className="border-red-500/20 bg-red-50 text-red-500 hover:bg-red-100">
                  <AlertCircle className="mr-1 h-3 w-3" /> Not Connected
                </Badge>
              )}
              {status === 'error' && (
                <Badge variant="outline" className="border-red-500/30 bg-red-50 text-red-500 hover:bg-red-100">
                  <AlertCircle className="mr-1 h-3 w-3" /> Connection Failed
                </Badge>
              )}
              {status === 'connecting' && (
                <Badge variant="outline" className="border-blue-500/30 bg-blue-50 text-blue-500">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Saving Token...
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 text-gray-400">
              <Shield size={12} />
              <p className="text-[10px]">Token is encrypted before storage. Only you can access it.</p>
            </div>
          </div>
        </div>

        {/* RIGHT: 2/3 — Instructions */}
        <div className="lg:col-span-2 flex flex-col justify-center p-8 lg:p-12">
          <div className="space-y-8">
            <div>
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-widest mb-2">Setup Guide</p>
              <h2 className="text-2xl font-bold text-black tracking-tight">{config.guideTitle}</h2>
              <p className="text-sm text-gray-500 mt-2 max-w-lg">{config.guideSubtitle}</p>
            </div>

            <div className="space-y-4">
              {config.steps.map((step, i) => (
                <div key={i} className="group flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200 hover:border-blue-500/20 transition-all">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500 text-sm font-bold">{i + 1}</div>
                  <div>
                    <p className="text-sm font-medium text-black">{step.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
