import { ProfilePhoto } from "@/components/ProfilePhoto";
import type { RepoSecurityData } from "./mockData";

type Props = {
  data: RepoSecurityData;
  repoTitle: string;
};

export function SecurityProfilePanel({ data, repoTitle }: Props) {
  const v = data.vulnerabilities;
  const p = data.vulnPct;

  return (
    <div className="flex h-full min-h-[420px] flex-col gap-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#00C2CB]">Selected Repo Security Profile</h3>
        <p className="mt-1 truncate text-sm font-medium text-gray-600">{repoTitle}</p>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-4xl font-bold tabular-nums text-gray-900">{v.total}</span>
          <span className="text-sm text-gray-500">Total vulnerabilities</span>
        </div>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Outdated packages — severity</p>
        <ul className="mt-3 space-y-3">
          <SeverityBar label="Critical" pct={p.critical} color="bg-[#EF4444]" />
          <SeverityBar label="High" pct={p.high} color="bg-orange-500" />
          <SeverityBar label="Medium" pct={p.medium} color="bg-blue-500" />
          <SeverityBar label="Low" pct={p.low} color="bg-yellow-400" />
        </ul>
      </section>

      <section className="flex-1 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-500">Users with critical access</h3>
        <p className="mt-1 text-2xl font-bold text-gray-900">{data.usersCriticalAccess.length}</p>
        <ul className="mt-4 space-y-3">
          {data.usersCriticalAccess.map((u) => (
            <li
              key={u.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5"
            >
              <ProfilePhoto src={null} alt="" label={u.name} className="h-9 w-9" fallbackClassName="bg-[#00C2CB]/20 text-[#00C2CB]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{u.name}</p>
                <p className="truncate text-[11px] text-gray-500">{u.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function SeverityBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <li>
      <div className="mb-1 flex justify-between text-[10px] text-gray-600">
        <span>{label}</span>
        <span className="font-mono text-gray-700">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
}
