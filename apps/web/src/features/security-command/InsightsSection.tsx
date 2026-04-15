import { ChevronRight, ShieldAlert, Skull, Wrench } from "lucide-react";
import { motion } from "framer-motion";

import type { RepoSecurityData } from "./mockData";

type Props = {
  data: RepoSecurityData;
};

const toneIcon = {
  critical: Skull,
  high: ShieldAlert,
  deploy: Wrench,
};

const toneRing = {
  critical: "border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444]",
  high: "border-orange-500/40 bg-orange-500/10 text-orange-400",
  deploy: "border-[#00C2CB]/35 bg-[#00C2CB]/10 text-[#00C2CB]",
};

export function InsightsSection({ data }: Props) {
  const items = data.insights;
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          Insights <span className="text-gray-400">({items.length})</span>
        </h2>
        <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[10px] font-medium text-[#00C2CB]">
          Security
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {items.map((item, i) => {
          const Icon = toneIcon[item.tone];
          return (
            <motion.button
              key={item.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="group flex w-full items-start gap-3 rounded-2xl border border-gray-200 bg-white p-4 text-left transition hover:border-[#00C2CB]/35"
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${toneRing[item.tone]}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">{item.lines[0]}</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{item.lines[1]}</p>
              </div>
              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-300 transition group-hover:text-[#00C2CB]" />
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
