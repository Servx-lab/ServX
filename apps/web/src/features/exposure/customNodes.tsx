import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Database, GitBranch, Server, User } from "lucide-react";

const card =
  "min-w-[160px] max-w-[200px] rounded-xl border bg-white px-3 py-2.5 shadow-md transition-shadow duration-200";

function UserNodeInner({ data }: NodeProps) {
  const d = data as { label: string; sub?: string };
  return (
    <div
      className={`${card} cursor-pointer border-[#00C2CB] shadow-[0_0_16px_rgba(0,194,203,0.2)] ring-1 ring-[#00C2CB]/25`}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50">
          <User className="h-4 w-4 text-[#00C2CB]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold tracking-tight text-gray-900">{d.label}</p>
          {d.sub && <p className="truncate text-[10px] text-gray-500">{d.sub}</p>}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="auth-out"
        className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#00C2CB]"
      />
    </div>
  );
}

function RepoNodeInner({ data }: NodeProps) {
  const d = data as { label: string; org?: string };
  return (
    <div className={`${card} border-[#6C63FF]/60 shadow-[0_0_12px_rgba(108,99,255,0.15)] ring-1 ring-violet-100`}>
      <Handle
        type="target"
        position={Position.Top}
        id="auth-in"
        className="!h-2 !w-2 !border-0 !bg-[#6C63FF]/70"
      />
      <div className="flex items-start gap-2">
        <GitBranch className="mt-0.5 h-4 w-4 shrink-0 text-[#6C63FF]" />
        <div className="min-w-0">
          <p className="truncate font-mono text-[11px] font-medium text-gray-900">{d.label}</p>
          {d.org && <p className="truncate text-[10px] text-gray-500">{d.org}</p>}
        </div>
      </div>
    </div>
  );
}

function ServerNodeInner({ data }: NodeProps) {
  const d = data as { label: string; region?: string };
  return (
    <div className={`${card} border-cyan-300/80 ring-1 ring-cyan-100`}>
      <Handle
        type="target"
        position={Position.Top}
        id="auth-in"
        className="!h-2 !w-2 !border-0 !bg-[#00C2CB]/70"
      />
      <div className="flex items-start gap-2">
        <Server className="mt-0.5 h-4 w-4 shrink-0 text-[#00C2CB]" />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-gray-900">{d.label}</p>
          {d.region && <p className="truncate text-[10px] text-gray-500">{d.region}</p>}
        </div>
      </div>
    </div>
  );
}

function DatabaseNodeInner({ data }: NodeProps) {
  const d = data as { label: string; engine?: string };
  return (
    <div className={`${card} border-red-300 shadow-[0_0_12px_rgba(239,68,68,0.12)] ring-1 ring-red-100`}>
      <Handle
        type="target"
        position={Position.Top}
        id="auth-in"
        className="!h-2 !w-2 !border-0 !bg-[#EF4444]/80"
      />
      <div className="flex items-start gap-2">
        <Database className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-gray-900">{d.label}</p>
          {d.engine && <p className="truncate text-[10px] text-gray-500">{d.engine}</p>}
        </div>
      </div>
    </div>
  );
}

export const UserNode = memo(UserNodeInner);
export const RepoNode = memo(RepoNodeInner);
export const ServerNode = memo(ServerNodeInner);
export const DatabaseNode = memo(DatabaseNodeInner);
