import { memo, useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  Background,
  BaseEdge,
  Controls,
  getSmoothStepPath,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Database } from "lucide-react";

import type { AccessLevel, NetworkUser } from "./mockData";

const TEAL = "#00C2CB";

function accessColor(a: AccessLevel): string {
  if (a === "admin") return "#EF4444";
  if (a === "write") return TEAL;
  return "#64748B";
}

function RepoCenterNode({ data }: NodeProps) {
  const d = data as { label: string };
  return (
    <div className="min-w-[150px] max-w-[190px] rounded-2xl border-2 border-[#00C2CB] bg-white px-4 py-3 text-center shadow-[0_0_20px_rgba(0,194,203,0.22)]">
      <Database className="mx-auto mb-2 h-6 w-6 text-[#00C2CB]" />
      <p className="text-xs font-bold text-gray-900">{d.label}</p>
      <Handle type="source" position={Position.Bottom} id="out" className="!h-2 !w-2 !border-2 !border-white !bg-[#00C2CB]" />
    </div>
  );
}

function NetworkUserNode({ data }: NodeProps) {
  const d = data as { name: string; access: AccessLevel; highlight?: boolean; pulse?: boolean };
  const col = accessColor(d.access);
  return (
    <div
      className={`min-w-[118px] rounded-xl border px-2.5 py-2 shadow-lg ${
        d.pulse
          ? "animate-pulse border-[#EF4444] shadow-[0_0_20px_rgba(239,68,68,0.45)] ring-2 ring-[#EF4444]/50"
          : d.highlight
            ? "border-[#EF4444]/80 shadow-[0_0_16px_rgba(239,68,68,0.25)]"
            : "border-gray-200"
      } bg-white`}
    >
      <Handle type="target" position={Position.Top} id="in" className="!h-2 !w-2 !border-0 !bg-gray-300" />
      <p className="truncate text-center text-[11px] font-semibold text-gray-900">{d.name}</p>
      <p className="mt-0.5 text-center text-[9px] uppercase tracking-wide" style={{ color: col }}>
        {d.access}
      </p>
    </div>
  );
}

function AccessEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props;
  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const d = data as { access?: AccessLevel; chain?: boolean } | undefined;
  const stroke = d?.access ? accessColor(d.access) : TEAL;
  const chain = d?.chain === true;
  return (
    <BaseEdge
      id={id}
      path={path}
      className={chain ? "animate-pulse" : ""}
      style={{
        stroke: chain ? "#EF4444" : stroke,
        strokeWidth: chain ? 3 : 2,
        strokeDasharray: chain ? "6 4" : undefined,
        filter: chain ? "drop-shadow(0 0 6px rgba(239,68,68,0.85))" : undefined,
        opacity: chain ? 1 : 0.9,
      }}
    />
  );
}

const nodeTypes = { repoCenter: RepoCenterNode, netUser: NetworkUserNode };
const edgeTypes = { access: AccessEdge };

/** Fan layout: repo top-center, users in an arc below for clean top→bottom edges. */
function buildGraph(repoLabel: string, users: NetworkUser[]): { nodes: Node[]; edges: Edge[] } {
  const cx = 360;
  const repoY = 42;
  const rowY = 430;
  const width = 700;
  const n = users.length;
  const gap = n <= 1 ? 0 : width / (n + 1);

  const nodes: Node[] = [
    {
      id: "repo-center",
      type: "repoCenter",
      position: { x: cx - 75, y: repoY },
      data: { label: repoLabel },
    },
  ];

  users.forEach((u, i) => {
    const x = 50 + gap * (i + 1) - 55;
    nodes.push({
      id: u.id,
      type: "netUser",
      position: { x, y: rowY },
      data: { name: u.name, access: u.access },
    });
  });

  const edges: Edge[] = users.map((u) => ({
    id: `e-${u.id}`,
    source: "repo-center",
    target: u.id,
    sourceHandle: "out",
    targetHandle: "in",
    type: "access",
    data: { access: u.access },
  }));

  return { nodes, edges };
}

type InnerProps = {
  repoLabel: string;
  users: NetworkUser[];
};

function GraphInner({ repoLabel, users }: InnerProps) {
  const built = useMemo(() => buildGraph(repoLabel, users), [repoLabel, users]);
  const [nodes, setNodes, onNodesChange] = useNodesState(built.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(built.edges);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const next = buildGraph(repoLabel, users);
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelected(null);
  }, [repoLabel, users, setNodes, setEdges]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type !== "netUser") return n;
        const on = selected === n.id;
        return { ...n, data: { ...n.data, pulse: on, highlight: on } };
      })
    );
    setEdges((eds) =>
      eds.map((e) => {
        const chain = selected !== null && e.target === selected;
        const access = (e.data as { access?: AccessLevel })?.access;
        return { ...e, data: { access, chain } };
      })
    );
  }, [selected, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: MouseEvent, node: Node) => {
      if (node.type !== "netUser") return;
      setSelected((s) => (s === node.id ? null : node.id));
    },
    []
  );

  const onPaneClick = useCallback(() => setSelected(null), []);

  return (
    <div className="h-[580px] w-full min-h-[520px] rounded-2xl border border-gray-200 bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.06 }}
        minZoom={0.45}
        maxZoom={1.25}
        proOptions={{ hideAttribution: true }}
        className="!bg-transparent"
        colorMode="light"
      >
        <Background color="#94A3B8" gap={20} size={1} className="opacity-[0.25]" />
        <Controls
          className="!rounded-lg !border !border-gray-200 !bg-white [&_button]:!bg-white [&_button]:!fill-[#00C2CB] [&_button]:!border-gray-200"
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
}

export const RepoAccessNetwork = memo(function RepoAccessNetwork(props: InnerProps) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
});
