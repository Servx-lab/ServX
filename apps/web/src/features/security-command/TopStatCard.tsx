import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  trend?: { pct: number; up: boolean };
  /** When true, render children instead of value (e.g. ring chart) */
  children?: ReactNode;
};

export function TopStatCard({ icon: Icon, label, value, sub = "for last month", trend, children }: Props) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#00C2CB]/40">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 text-[#00C2CB]">
          <Icon className="h-4 w-4" />
        </div>
        {trend && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              trend.up ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            }`}
          >
            {trend.up ? "↑" : "↓"} {trend.pct}%
          </span>
        )}
      </div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <div className="mt-1 flex flex-1 items-end justify-between gap-2">
        <div className="w-full">
          {children ?? <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>}
          {sub ? <p className="mt-0.5 text-[10px] text-gray-500">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}
