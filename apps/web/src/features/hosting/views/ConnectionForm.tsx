import React, { useState } from 'react';
import { Globe, Key, Loader2, Shield, AlertCircle, Copy, Check, ChevronRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  aliasInput: string;
  setAliasInput: (val: string) => void;
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
  aliasInput,
  setAliasInput,
  showToken,
  setShowToken,
  status,
  setStatus,
  errorMsg,
  handleConnect
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2>(1);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!config.defaultKeyName) return;
    navigator.clipboard.writeText(config.defaultKeyName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNextStep = () => {
    setActiveStep(2);
  };

  const handlePrevStep = () => {
    setActiveStep(1);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    await handleConnect();
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white flex flex-col justify-between">
      {/* Decorative Blur Blobs */}
      <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-blue-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-blue-500/5 blur-[100px] pointer-events-none" />

      {/* TOP: Unified Wizard Header & Progress Bar */}
      <div className="relative z-10 p-6 border-b border-gray-100 bg-gray-50/20 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white border border-gray-150 shadow-sm">{config.logoSmall}</div>
            <div>
              <h3 className="text-base font-bold text-black flex items-center gap-1.5">
                Connect {config.label} Account
              </h3>
              <p className="text-xs text-gray-500">Step-by-step connection wizard</p>
            </div>
          </div>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveStep(1)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeStep === 1
                  ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-black/10 text-[10px]">1</span>
              Get Credentials
            </button>
            <ChevronRight className="h-3 w-3 text-gray-400" />
            <button
              onClick={() => { if (tokenInput.trim() || activeStep === 2) setActiveStep(2); }}
              disabled={!tokenInput.trim() && activeStep === 1}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeStep === 2
                  ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-black/10 text-[10px]">2</span>
              Enter API Key
            </button>
          </div>
        </div>
      </div>

      {/* MIDDLE: Sliding Carousel Body (Framer Motion) */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6 py-8 md:px-12 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {activeStep === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="space-y-6 w-full"
            >
              <div>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Step 1 of 2</p>
                <h2 className="text-xl font-extrabold text-black tracking-tight mt-1">{config.guideTitle}</h2>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{config.guideSubtitle}</p>
              </div>

              {/* Action Buttons: Direct Link & Copy Key Name */}
              <div className="flex flex-wrap items-center gap-3.5">
                {config.tokenPageUrl && (
                  <a
                    href={config.tokenPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-100 bg-blue-50/50 text-xs font-bold text-blue-600 hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 shadow-sm group"
                  >
                    {config.tokenPageLabel || 'Get API Key'}
                    <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
                  </a>
                )}

                {config.defaultKeyName && (
                  <div className="p-2.5 rounded-lg border border-gray-150 bg-gray-50/50 flex items-center gap-3.5 shadow-sm">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Recommended Key Name</p>
                      <code className="text-xs font-mono text-black font-semibold bg-white border border-gray-200 px-1.5 py-0.5 rounded">{config.defaultKeyName}</code>
                    </div>
                    <button
                      onClick={handleCopy}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all active:scale-95 duration-200 ${
                        copied
                          ? 'bg-green-500 border-green-500 text-white shadow-sm'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="h-3 w-3" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 text-gray-400" />
                          Copy Name
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Guide steps */}
              <div className="space-y-3.5 pt-2">
                {config.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-4 p-3.5 rounded-lg bg-gray-50/50 border border-gray-100 hover:border-blue-500/10 hover:bg-gray-50 transition-all">
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-white border border-gray-150 flex items-center justify-center text-blue-500 text-xs font-bold shadow-sm">{i + 1}</div>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-black">{step.title}</p>
                      <p className="text-[11px] text-gray-500 leading-normal">{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleNextStep}
                  className="px-5 h-11 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-1.5 rounded-lg"
                >
                  I have my API Key
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="space-y-6 w-full"
            >
              <div>
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Step 2 of 2</p>
                <h2 className="text-xl font-extrabold text-black tracking-tight mt-1">Paste Credentials & Connect</h2>
                <p className="text-xs text-gray-500 mt-2">Enter the generated token or key details below to establish a secure, AES-256 encrypted link with your {config.label} account.</p>
              </div>

              {/* Input Forms */}
              <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
                {config.key === 'coolify' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Instance URL</label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="url"
                        placeholder="https://app.coolify.io"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="bg-white border-gray-200 text-black placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/20 pl-11 h-11 text-xs"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{config.tokenLabel}</label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type={showToken ? 'text' : 'password'}
                      placeholder={config.placeholder}
                      value={tokenInput}
                      onChange={(e) => { setTokenInput(e.target.value); if (status === 'error') setStatus('idle'); }}
                      className="bg-white border-gray-200 text-black placeholder:text-gray-400 focus:border-blue-500/50 focus:ring-blue-500/20 pl-11 pr-11 h-11 text-xs font-mono"
                      required
                    />
                  </div>
                </div>

                {errorMsg && status === 'error' && (
                  <div className="p-3 rounded-lg border border-red-100 bg-red-50/50 flex items-start gap-2.5 text-xs text-red-600 animate-in fade-in duration-300">
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Wizard Footer Controls */}
                <div className="pt-4 flex items-center justify-between gap-4 border-t border-gray-100 mt-6">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    disabled={status === 'connecting'}
                    className="flex items-center gap-1.5 px-4 h-11 rounded-lg border border-gray-200 bg-white text-xs font-bold text-gray-600 hover:bg-gray-50 active:scale-95 disabled:opacity-50 transition-all"
                  >
                    <ArrowLeft className="h-4 w-4 text-gray-400" />
                    Back
                  </button>

                  <Button
                    type="submit"
                    disabled={status === 'connecting' || !tokenInput.trim()}
                    className="px-6 h-11 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2 rounded-lg"
                  >
                    {status === 'connecting' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving Token...
                      </>
                    ) : (
                      <>
                        Connect Account
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM: Security & Encryption Footer */}
      <div className="relative z-10 px-6 py-4 border-t border-gray-50 bg-gray-50/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-gray-400">
          <Shield size={12} className="text-gray-400" />
          <p className="text-[10px] font-medium">All connection credentials are AES-256 encrypted before secure storage</p>
        </div>

        <div className="flex items-center gap-2">
          {status === 'idle' && (
            <Badge variant="outline" className="border-red-500/20 bg-red-50 text-red-500 hover:bg-red-100 rounded-md text-[10px] py-0.5 px-2">
              <AlertCircle className="mr-1 h-3 w-3" /> Not Connected
            </Badge>
          )}
          {status === 'error' && (
            <Badge variant="outline" className="border-red-500/30 bg-red-50 text-red-500 hover:bg-red-100 rounded-md text-[10px] py-0.5 px-2">
              <AlertCircle className="mr-1 h-3 w-3" /> Connection Failed
            </Badge>
          )}
          {status === 'connecting' && (
            <Badge variant="outline" className="border-blue-500/30 bg-blue-50 text-blue-500 rounded-md text-[10px] py-0.5 px-2">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" /> In Progress...
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
