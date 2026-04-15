import { motion } from "framer-motion";
import { AlertTriangle, Skull, Zap } from "lucide-react";

export type ThreatItem = {
  id: string;
  severity: "critical" | "warning";
  title: string;
  detail: string;
  source: string;
  time: string;
};

const MOCK_FEED: ThreatItem[] = [
  {
    id: "t1",
    severity: "critical",
    title: "Critical: Express.js prototype pollution",
    detail: "GHSA-xxxx — Zync monorepo · servx/api@4.19.x",
    source: "GitHub Dependabot",
    time: "2m ago",
  },
  {
    id: "t2",
    severity: "critical",
    title: "Critical: openssl CVE in base image",
    detail: "Debian bookworm-slim — fly deploy #4821",
    source: "Container scan",
    time: "14m ago",
  },
  {
    id: "t3",
    severity: "warning",
    title: "Warning: lodash.template advisory",
    detail: "Moderate — transitive via legacy CLI · servx/web",
    source: "npm audit",
    time: "32m ago",
  },
  {
    id: "t4",
    severity: "warning",
    title: "Warning: TLS chain expiring",
    detail: "Edge cert `*.servx.dev` — renewal in 11 days",
    source: "Exposure radar",
    time: "1h ago",
  },
];

export function CveFeedPanel() {
  return (
    <aside className="flex h-full min-h-[320px] flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-gray-100 pb-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6C63FF]">CVE scanner feed</h2>
          <p className="mt-1 text-[10px] text-gray-500">Live dependency & posture stream</p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-200 bg-violet-50">
          <Zap className="h-4 w-4 text-[#6C63FF]" />
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {MOCK_FEED.map((item, i) => {
          const critical = item.severity === "critical";
          return (
            <motion.li
              key={item.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`rounded-xl border px-3 py-2.5 ${
                critical
                  ? "border-red-200 bg-red-50/80 shadow-sm"
                  : "border-violet-200/80 bg-violet-50/50"
              }`}
            >
              <div className="flex items-start gap-2">
                {critical ? (
                  <Skull className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EF4444]" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6C63FF]" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[11px] font-semibold leading-snug ${
                      critical ? "text-[#EF4444]" : "text-[#6C63FF]"
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-gray-600">{item.detail}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-[9px] uppercase tracking-wide text-gray-500">
                    <span>{item.source}</span>
                    <span className="font-mono text-cyan-600">{item.time}</span>
                  </div>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </aside>
  );
}
