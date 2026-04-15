import { useMemo, useState } from "react";
import { Activity, GitPullRequest, Laptop, Mail, Package, Users } from "lucide-react";
import { motion } from "framer-motion";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CICDRing } from "./CICDRing";
import { InsightsSection } from "./InsightsSection";
import { MOCK_BY_REPO, REPO_OPTIONS, type RepoId } from "./mockData";
import { RepoAccessNetwork } from "./networkGraph";
import { SecurityProfilePanel } from "./SecurityProfilePanel";
import { TopStatCard } from "./TopStatCard";

import "@xyflow/react/dist/style.css";

/**
 * Full-viewport command center — no app chrome (use route outside DashboardLayout).
 */
export default function PlatformSecurityCommandCenter() {
  const [repoId, setRepoId] = useState<RepoId>("zync");
  const data = MOCK_BY_REPO[repoId];
  const repoLabel = useMemo(() => REPO_OPTIONS.find((r) => r.id === repoId)?.label ?? "Repo", [repoId]);

  return (
    <div className="min-h-full w-full overflow-x-hidden bg-white text-gray-900">
      {/* Soft light glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 top-0 h-[55vh] w-[60vw] rounded-full bg-[radial-gradient(ellipse,rgba(0,194,203,0.10)_0%,transparent_65%)] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[45vh] w-[45vw] rounded-full bg-[radial-gradient(ellipse,rgba(59,130,246,0.08)_0%,transparent_65%)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1600px] px-4 pb-14 pt-20 md:px-8 md:py-10">
        <motion.header
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col items-center gap-5 text-center md:mb-10"
        >
          <h1 className="text-balance text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">
            Platform Security Command Center
          </h1>
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:gap-3">
            <span className="text-sm text-gray-600">Repository</span>
            <Select value={repoId} onValueChange={(v) => setRepoId(v as RepoId)}>
              <SelectTrigger className="h-11 w-[min(100vw-2rem,280px)] border-gray-200 bg-white text-gray-900 shadow-sm hover:border-[#00C2CB]/40 [&>svg]:hidden">
                <SelectValue placeholder="Select repository" />
              </SelectTrigger>
              <SelectContent className="border-gray-200 bg-white text-gray-900">
                {REPO_OPTIONS.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.header>

        {/* Row 1 — six stat cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          <TopStatCard
            icon={Package}
            label="Outdated packages"
            value={data.outdatedPackages}
            trend={{ pct: 8, up: true }}
          />
          <TopStatCard
            icon={Laptop}
            label="Connected devices"
            value={data.connectedDevices}
            trend={{ pct: 3, up: false }}
          />
          <TopStatCard
            icon={Mail}
            label="Gmail (last month)"
            value={data.gmailLastMonth.toLocaleString()}
            sub="messages received"
            trend={{ pct: 5, up: true }}
          />
          <TopStatCard
            icon={GitPullRequest}
            label="Last month — commits / PRs"
            value={data.lastMonthChanges.count}
            sub="on selected repo"
            trend={{ pct: data.lastMonthChanges.pct, up: data.lastMonthChanges.up }}
          />
          <TopStatCard icon={Users} label="Active developers (30d)" value={data.activeDevelopers} trend={{ pct: 4, up: true }} />
          <TopStatCard icon={Activity} label="CI/CD success rate" value="" sub="last 30 builds">
            <div className="flex items-center gap-2 pt-1">
              <CICDRing percentage={data.cicdSuccess} size={52} stroke={4} />
              <p className="text-[10px] text-gray-500">Pipeline health</p>
            </div>
          </TopStatCard>
        </div>

        {/* Row 2 — graph 2/3 + panel 1/3 */}
        <div className="mb-6 grid grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-2">
            <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">
              Repository access network
            </h2>
            <p className="mb-3 text-xs text-gray-600">
              Center = selected repo. Edges:{" "}
              <span className="text-[#EF4444]">Admin</span> · <span className="text-[#00C2CB]">Write</span> ·{" "}
              <span className="text-blue-500">Read</span>. Click a user to pulse the chain.
            </p>
            <RepoAccessNetwork repoLabel={repoLabel} users={data.networkUsers} />
          </div>
          <div className="lg:col-span-1">
            <SecurityProfilePanel data={data} repoTitle={repoLabel} />
          </div>
        </div>

        {/* Row 3 — insights */}
        <InsightsSection data={data} />
      </div>
    </div>
  );
}
