import React from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { ExposureScore } from '../api';

interface UserGreetingWidgetProps {
  score?: ExposureScore;
}

const TIPS = [
  "Enable HSTS on all public-facing subdomains.",
  "Rotate IAM credentials every 90 days.",
  "Restrict S3 bucket ACLs to least-privilege.",
  "Add Content-Security-Policy headers to all origins.",
  "Scan new deployments before they reach production.",
];

export const UserGreetingWidget: React.FC<UserGreetingWidgetProps> = ({ score }) => {
  const { user } = useAuth();
  const firstName = user?.displayName?.split(' ')[0] ?? 'there';
  const s = score?.score ?? 100;

  const tip = TIPS[new Date().getDay() % TIPS.length];

  const config =
    s >= 80
      ? {
          phrase: "Your infrastructure is fortified.",
          color: "text-emerald-600",
          dot: "bg-emerald-500",
          dotGlow: "shadow-[0_0_8px_rgba(16,185,129,0.6)]",
          badge: "bg-emerald-50 text-emerald-600 border-emerald-100",
          badgeLabel: "Secure",
        }
      : s >= 60
      ? {
          phrase: "Elevated risk detected today.",
          color: "text-amber-600",
          dot: "bg-amber-500",
          dotGlow: "shadow-[0_0_8px_rgba(245,158,11,0.6)]",
          badge: "bg-amber-50 text-amber-600 border-amber-100",
          badgeLabel: "Elevated",
        }
      : {
          phrase: "Immediate action required.",
          color: "text-rose-600",
          dot: "bg-rose-500",
          dotGlow: "shadow-[0_0_8px_rgba(244,63,94,0.6)]",
          badge: "bg-rose-50 text-rose-600 border-rose-100",
          badgeLabel: "Critical",
        };

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm space-y-4">
      <div>
        <p className="text-xs font-semibold text-gray-400 mb-2">Hi {firstName},</p>
        <div className="flex items-start gap-3">
          <div className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${config.dot} ${config.dotGlow}`} />
          <p className={`text-lg font-black leading-snug tracking-tight ${config.color}`}>
            {config.phrase}
          </p>
        </div>
        <div className="mt-3 ml-5">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${config.badge}`}>
            {config.badgeLabel}
          </span>
        </div>
      </div>

      <div className="border-t border-gray-50 pt-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Security Tip</p>
        <p className="text-xs text-gray-500 leading-relaxed italic">"{tip}"</p>
      </div>
    </div>
  );
};
