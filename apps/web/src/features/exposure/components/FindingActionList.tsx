import React, { useState } from 'react';
import { Wrench, CheckCircle, Clock, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Finding } from '../api';
import { formatDistanceToNow } from 'date-fns';

interface FindingActionListProps {
  findings?: Finding[];
}

type Severity = Finding['severity'];

const SEVERITY_BORDER: Record<Severity, string> = {
  CRITICAL: 'border-l-rose-500',
  HIGH:     'border-l-orange-400',
  MEDIUM:   'border-l-amber-400',
  LOW:      'border-l-blue-400',
  INFO:     'border-l-gray-300',
};

const SEVERITY_DOT: Record<Severity, string> = {
  CRITICAL: 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]',
  HIGH:     'bg-orange-400 shadow-[0_0_6px_rgba(249,115,22,0.6)]',
  MEDIUM:   'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.6)]',
  LOW:      'bg-blue-400',
  INFO:     'bg-gray-300',
};

const SEVERITY_BADGE: Record<Severity, string> = {
  CRITICAL: 'bg-rose-50 text-rose-600 border-rose-100',
  HIGH:     'bg-orange-50 text-orange-600 border-orange-100',
  MEDIUM:   'bg-amber-50 text-amber-600 border-amber-100',
  LOW:      'bg-blue-50 text-blue-600 border-blue-100',
  INFO:     'bg-gray-50 text-gray-500 border-gray-100',
};

const CATEGORY_BADGE: Record<string, string> = {
  network:       'bg-rose-50 text-rose-600 border-rose-100',
  web_headers:   'bg-orange-50 text-orange-600 border-orange-100',
  dns:           'bg-blue-50 text-blue-600 border-blue-100',
  iam:           'bg-amber-50 text-amber-600 border-amber-100',
  cloud_storage: 'bg-purple-50 text-purple-600 border-purple-100',
};

const CATEGORY_LABEL: Record<string, string> = {
  network:       'Network',
  web_headers:   'Web Headers',
  dns:           'DNS',
  iam:           'IAM',
  cloud_storage: 'Cloud',
};

const TABS = ['All', 'Critical', 'Open Ports', 'Headers'] as const;
type Tab = typeof TABS[number];

function matchesTab(finding: Finding, tab: Tab): boolean {
  if (tab === 'All') return true;
  if (tab === 'Critical') return finding.severity === 'CRITICAL' || finding.severity === 'HIGH';
  if (tab === 'Open Ports') return finding.category === 'network';
  if (tab === 'Headers') return finding.category === 'web_headers';
  return true;
}

export const FindingActionList: React.FC<FindingActionListProps> = ({ findings }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('All');
  const all = findings ?? [];
  const list = all.filter((f) => matchesTab(f, activeTab));

  const criticalCount = all.filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH').length;

  return (
    <div className="rounded-3xl border border-gray-100 bg-white shadow-sm flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="p-5 pb-3 border-b border-gray-50 flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Action Center</h3>
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${criticalCount > 0 ? 'bg-rose-50 text-rose-500' : 'bg-gray-50 text-gray-400'}`}>
          {all.length} OPEN
        </span>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-50 flex-wrap">
        {TABS.map((tab) => {
          const count = tab === 'All' ? all.length : all.filter((f) => matchesTab(f, tab)).length;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold transition-all ${
                isActive
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-gray-100 space-y-2">
        {list.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center p-8 relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(52,211,153,0.05)_0%,transparent_70%)] pointer-events-none rounded-3xl" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 mb-4 shadow-[0_0_24px_rgba(52,211,153,0.2)] border border-emerald-100">
              <CheckCircle className="h-7 w-7 text-emerald-500" />
            </div>
            <p className="text-base font-black text-gray-900 tracking-tight">Zero Threats Detected</p>
            <p className="text-xs text-gray-400 mt-1.5 max-w-[200px] leading-relaxed">
              No active vulnerabilities found across your infrastructure footprint.
            </p>
          </div>
        ) : (
          list.map((finding) => {
            const isCriticalOrHigh = finding.severity === 'CRITICAL' || finding.severity === 'HIGH';
            const catLabel = CATEGORY_LABEL[finding.category] ?? finding.category;
            const catBadge = CATEGORY_BADGE[finding.category] ?? 'bg-gray-50 text-gray-500 border-gray-100';
            const sevBadge = SEVERITY_BADGE[finding.severity] ?? SEVERITY_BADGE.INFO;
            return (
              <div
                key={finding.id}
                className={`flex flex-col gap-2.5 rounded-2xl border border-l-4 border-gray-100 bg-white p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${SEVERITY_BORDER[finding.severity]}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[finding.severity]}`} />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 leading-tight truncate">{finding.title}</h4>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold ${catBadge}`}>
                        {catLabel}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold ${sevBadge}`}>
                        {finding.severity}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Clock size={9} />
                        {formatDistanceToNow(new Date(finding.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-[10px] font-semibold text-gray-400 mt-1 uppercase tracking-wide truncate">
                      {finding.asset_value}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  {isCriticalOrHigh ? (
                    <button
                      onClick={() => navigate(`/auto-medic?findingId=${finding.id}`)}
                      className="flex items-center gap-1.5 rounded-lg bg-[#6C63FF] px-3 py-1.5 text-[11px] font-bold text-white transition-all hover:bg-indigo-600 shadow-sm hover:shadow-indigo-200"
                    >
                      <Wrench size={11} />
                      Resolve with Auto-Medic
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/auto-medic?findingId=${finding.id}`)}
                      className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-bold text-gray-500 transition-all hover:bg-gray-50 hover:text-gray-900"
                    >
                      <Eye size={11} />
                      View Details
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
