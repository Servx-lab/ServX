import { motion } from "framer-motion";
import { Radar } from "lucide-react";

import { BlastRadiusFlow } from "./BlastRadiusFlow";
import { CveFeedPanel } from "./CveFeedPanel";
import { OrphanedSecretsTable } from "./OrphanedSecretsTable";

/**
 * Exposure Analysis — light command-center layout with accent teal / purple / danger.
 */
export default function ExposureAnalysisPage() {
  return (
    <main className="relative min-h-full flex-1 overflow-hidden bg-white px-4 pb-16 pt-20 font-sans text-gray-800 md:px-8">
      {/* Subtle radar-style glow (light theme) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[42%] h-[120vh] w-[120vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,194,203,0.09)_0%,transparent_55%)]" />
        <div
          className="absolute left-1/2 top-[48%] h-[95vh] w-[95vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(108,99,255,0.06)_0%,transparent_50%)] opacity-90"
          aria-hidden
        />
        <div
          className="absolute left-1/2 top-1/2 h-[140vh] w-[140vh] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#00C2CB]/10"
          style={{
            background:
              "repeating-radial-gradient(circle at center, transparent 0, transparent 48px, rgba(0,194,203,0.035) 49px, transparent 50px)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1600px] space-y-8">
        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#00C2CB]/30 bg-cyan-50/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-700 shadow-sm backdrop-blur-sm">
              <Radar className="h-3.5 w-3.5 text-[#00C2CB]" />
              Exposure analysis
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
              Attack surface <span className="text-[#00C2CB]">radar</span>
            </h1>
            <p className="max-w-2xl text-sm text-gray-500">
              Blast-radius mapping across identities and infrastructure, dormant privilege detection, and live CVE
              telemetry — unified in a single command view.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white/90 px-4 py-3 text-right shadow-sm backdrop-blur-sm">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6C63FF]">Node legend</p>
            <div className="mt-2 flex flex-wrap justify-end gap-x-4 gap-y-1 text-[10px] text-gray-600">
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full border-2 border-[#00C2CB] align-middle" /> User
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full border-2 border-[#6C63FF] align-middle" />{" "}
                Repository
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full border-2 border-[#00C2CB]/60 align-middle" />{" "}
                Server
              </span>
              <span>
                <span className="mr-1 inline-block h-2 w-2 rounded-full border-2 border-[#EF4444] align-middle" />{" "}
                Database
              </span>
            </div>
          </div>
        </motion.header>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Blast radius graph</h2>
            <p className="text-[11px] text-cyan-700">
              Select the <span className="font-medium text-[#00C2CB]">User</span> node — outbound edges pulse{" "}
              <span className="text-[#EF4444]">danger red</span>.
            </p>
          </div>
          <BlastRadiusFlow />
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
          <OrphanedSecretsTable />
          <CveFeedPanel />
        </div>
      </div>
    </main>
  );
}
