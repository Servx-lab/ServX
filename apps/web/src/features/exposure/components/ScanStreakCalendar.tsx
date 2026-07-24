import React, { useMemo } from 'react';
import { subDays, isSameDay, format } from 'date-fns';
import { Flame } from 'lucide-react';
import { Finding } from '../api';

interface ScanStreakCalendarProps {
  findings?: Finding[];
}

type DayStatus = 'clean' | 'critical' | 'warn' | 'none';

const STATUS_STYLE: Record<DayStatus, { bg: string; border: string; ring: string; label: string }> = {
  clean:    { bg: 'bg-emerald-100', border: 'border-emerald-200', ring: 'ring-emerald-400',  label: 'Clean scan' },
  critical: { bg: 'bg-rose-100',    border: 'border-rose-200',    ring: 'ring-rose-400',     label: 'Critical findings' },
  warn:     { bg: 'bg-amber-100',   border: 'border-amber-200',   ring: 'ring-amber-400',    label: 'Warnings' },
  none:     { bg: 'bg-gray-100',    border: 'border-gray-200',    ring: 'ring-gray-400',     label: 'No data' },
};

export const ScanStreakCalendar: React.FC<ScanStreakCalendarProps> = ({ findings }) => {
  const today = new Date();

  const days = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = subDays(today, 29 - i);
      const dayFindings = (findings ?? []).filter((f) =>
        isSameDay(new Date(f.created_at), date)
      );

      let status: DayStatus = 'none';
      if (dayFindings.length > 0) {
        const hasCritical = dayFindings.some(
          (f) => f.severity === 'CRITICAL' || f.severity === 'HIGH'
        );
        status = hasCritical ? 'critical' : 'warn';
        if (!hasCritical && dayFindings.every((f) => f.resolved)) status = 'clean';
        if (!hasCritical && dayFindings.some((f) => !f.resolved)) status = 'warn';
      }

      return { date, status, count: dayFindings.length, isToday: isSameDay(date, today) };
    });
  }, [findings, today]);

  const cleanStreak = useMemo(() => {
    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].status === 'clean' || days[i].status === 'none') streak++;
      else break;
    }
    const pureClean = days
      .slice()
      .reverse()
      .findIndex((d) => d.status !== 'clean');
    return pureClean === -1 ? 30 : pureClean;
  }, [days]);

  const LEGEND = [
    { color: 'bg-emerald-200', label: 'Clean' },
    { color: 'bg-amber-200',   label: 'Warnings' },
    { color: 'bg-rose-200',    label: 'Critical' },
    { color: 'bg-gray-200',    label: 'No data' },
  ];

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Scan Streak</h3>
          <p className="text-xs text-gray-400 mt-0.5">30-day infrastructure health</p>
        </div>
        <div className="flex gap-2 rounded-full border border-gray-100 bg-gray-50 p-0.5">
          <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-gray-700 shadow-sm">Monthly</span>
          <span className="px-3 py-1 text-[10px] font-bold text-gray-400">Yearly</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {days.map((day, i) => {
          const s = STATUS_STYLE[day.status];
          return (
            <div
              key={i}
              title={`${format(day.date, 'MMM d')} — ${s.label}${day.count > 0 ? ` (${day.count} findings)` : ''}`}
              className={`relative h-7 w-7 rounded-lg border transition-transform duration-150 hover:scale-110 cursor-default ${s.bg} ${s.border} ${day.isToday ? `ring-2 ring-offset-1 ${s.ring}` : ''}`}
            >
              {day.isToday && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[7px] font-black text-gray-600 leading-none">TODAY</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-gray-50 pt-4">
        <div className="flex items-center gap-3 flex-wrap">
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-sm ${l.color}`} />
              <span className="text-[9px] font-semibold text-gray-400">{l.label}</span>
            </div>
          ))}
        </div>
        {cleanStreak > 0 && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1">
            <Flame size={10} className="text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-600">{cleanStreak}d streak</span>
          </div>
        )}
      </div>
    </div>
  );
};
