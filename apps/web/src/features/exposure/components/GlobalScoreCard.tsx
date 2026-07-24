import React from 'react';
import { ExposureScore } from '../api';

interface GlobalScoreCardProps {
  score?: ExposureScore;
}

type GradeKey = 'A' | 'B' | 'C' | 'D' | 'F';

const GRADE_CONFIG: Record<GradeKey, {
  stroke: string; glow: string; label: string;
  glowBg1: string; glowBg2: string; badge: string;
}> = {
  A: { stroke: '#10b981', glow: 'rgba(16,185,129,0.5)',  label: 'text-emerald-400', glowBg1: 'rgba(0,194,203,0.18)',   glowBg2: 'rgba(16,185,129,0.12)',  badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  B: { stroke: '#14b8a6', glow: 'rgba(20,184,166,0.5)',  label: 'text-teal-400',    glowBg1: 'rgba(20,184,166,0.18)', glowBg2: 'rgba(0,194,203,0.12)',   badge: 'bg-teal-400/10 text-teal-400 border-teal-400/20' },
  C: { stroke: '#f59e0b', glow: 'rgba(245,158,11,0.5)',  label: 'text-amber-400',   glowBg1: 'rgba(245,158,11,0.18)', glowBg2: 'rgba(249,115,22,0.12)',  badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20' },
  D: { stroke: '#f97316', glow: 'rgba(249,115,22,0.5)',  label: 'text-orange-400',  glowBg1: 'rgba(249,115,22,0.18)', glowBg2: 'rgba(244,63,94,0.12)',   badge: 'bg-orange-400/10 text-orange-400 border-orange-400/20' },
  F: { stroke: '#f43f5e', glow: 'rgba(244,63,94,0.5)',   label: 'text-rose-400',    glowBg1: 'rgba(244,63,94,0.18)',  glowBg2: 'rgba(108,99,255,0.12)',  badge: 'bg-rose-400/10 text-rose-400 border-rose-400/20' },
};

const CATEGORY_META: { key: keyof ExposureScore['breakdown']; label: string }[] = [
  { key: 'network',       label: 'Net'   },
  { key: 'cloud_storage', label: 'Cloud' },
  { key: 'dns',           label: 'DNS'   },
  { key: 'iam',           label: 'IAM'   },
  { key: 'web_headers',   label: 'HTTP'  },
];

export const GlobalScoreCard: React.FC<GlobalScoreCardProps> = ({ score }) => {
  const currentScore = score?.score ?? 100;
  const grade = (score?.grade ?? 'A') as GradeKey;
  const status = score?.status ?? 'Secure';

  const cfg = GRADE_CONFIG[grade] ?? GRADE_CONFIG.A;

  const r = 58;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (circumference * currentScore) / 100;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gray-900 border border-gray-800 p-6 shadow-xl flex flex-col gap-5">
      {/* Ambient glow background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div
          className="absolute -top-1/2 -right-1/4 h-full w-3/4 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${cfg.glowBg1} 0%, transparent 70%)` }}
        />
        <div
          className="absolute -bottom-1/3 -left-1/4 h-3/4 w-3/4 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${cfg.glowBg2} 0%, transparent 70%)` }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between">
        <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Global Score</h3>
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${cfg.badge}`}>
          {status}
        </span>
      </div>

      {/* Ring gauge */}
      <div className="relative z-10 flex items-center justify-center">
        <svg width="160" height="160" viewBox="0 0 160 160" className="-rotate-90">
          <circle
            cx="80" cy="80" r={r}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="10"
            fill="none"
          />
          <circle
            cx="80" cy="80" r={r}
            stroke={cfg.stroke}
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 10px ${cfg.glow})`,
              transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className={`text-6xl font-black tracking-tighter leading-none ${cfg.label}`}>
            {grade}
          </span>
          <span className="mt-1 text-xs font-bold text-white/30">{currentScore}/100</span>
        </div>
      </div>

      {/* Category health dots */}
      <div className="relative z-10 grid grid-cols-5 gap-1 border-t border-white/5 pt-4">
        {CATEGORY_META.map(({ key, label }) => {
          const val = score?.breakdown?.[key] ?? 100;
          const dot =
            val >= 80 ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.7)]'
            : val >= 60 ? 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.7)]'
            : 'bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.7)]';
          return (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${dot}`} />
              <span className="text-[9px] font-bold text-white/25">{label}</span>
            </div>
          );
        })}
      </div>

      {/* Security posture label */}
      <div className="relative z-10 -mt-2">
        <p className="text-center text-[9px] font-bold uppercase tracking-[0.2em] text-white/20">
          Security Posture
        </p>
      </div>
    </div>
  );
};
