import React, { useCallback, useEffect, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { BlastRadiusEdge } from "./blastEdge";
import { DatabaseNode, RepoNode, ServerNode, UserNode } from "./customNodes";

const nodeTypes = {
  userNode: UserNode,
  repoNode: RepoNode,
  serverNode: ServerNode,
  dbNode: DatabaseNode,
};

const edgeTypes = {
  blast: BlastRadiusEdge,
};

const initialNodes: Node[] = [
  {
    id: "user-1",
    type: "userNode",
    position: { x: 260, y: 16 },
    data: { label: "Alex Rivera", sub: "Owner · click user to toggle blast" },
  },
  {
    id: "repo-a",
    type: "repoNode",
    position: { x: 24, y: 220 },
    data: { label: "servx/api", org: "ServX-lab" },
  },
  {
    id: "repo-b",
    type: "repoNode",
    position: { x: 280, y: 220 },
    data: { label: "servx/web", org: "ServX-lab" },
  },
  {
    id: "db-1",
    type: "dbNode",
    position: { x: 520, y: 220 },
    data: { label: "prod-analytics", engine: "PostgreSQL" },
  },
  {
    id: "server-1",
    type: "serverNode",
    position: { x: 520, y: 400 },
    data: { label: "render-web-prod", region: "iad" },
  },
];

const baseEdges: Omit<Edge, "data">[] = [
  {
    id: "e-u-ra",
    source: "user-1",
    target: "repo-a",
    sourceHandle: "auth-out",
    targetHandle: "auth-in",
    type: "blast",
  },
  {
    id: "e-u-rb",
    source: "user-1",
    target: "repo-b",
    sourceHandle: "auth-out",
    targetHandle: "auth-in",
    type: "blast",
  },
  {
    id: "e-u-db",
    source: "user-1",
    target: "db-1",
    sourceHandle: "auth-out",
    targetHandle: "auth-in",
    type: "blast",
  },
  {
    id: "e-u-sv",
    source: "user-1",
    target: "server-1",
    sourceHandle: "auth-out",
    targetHandle: "auth-in",
    type: "blast",
  },
];

function withBlastData(blastUserId: string | null): Edge[] {
  return baseEdges.map((e) => ({
    ...e,
    data: { blast: Boolean(blastUserId && e.source === blastUserId) },
  }));
}

function FlowCanvas() {
  const [blastUserId, setBlastUserId] = useState<string | null>("user-1");

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(withBlastData("user-1"));

  useEffect(() => {
    setEdges(withBlastData(blastUserId));
  }, [blastUserId, setEdges]);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type === "userNode") {
      setBlastUserId((prev) => (prev === node.id ? null : node.id));
    }
  }, []);

  const onPaneClick = useCallback(() => {
    setBlastUserId(null);
  }, []);

  return (
    <div className="h-[min(520px,70vh)] w-full min-h-[420px] rounded-2xl border border-gray-200 bg-gray-50/90 shadow-inner backdrop-blur-sm">
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
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.55}
        maxZoom={1.45}
        proOptions={{ hideAttribution: true }}
        className="!bg-transparent"
        colorMode="light"
      >
        <Background color="#94a3b8" gap={22} size={1.2} className="opacity-[0.35]" />
        <Controls
          className="!overflow-hidden !rounded-lg !border !border-gray-200 !bg-white !shadow-md [&_button]:!border-gray-200 [&_button]:!bg-white [&_button]:!fill-gray-700 [&_button:hover]:!bg-gray-50"
          showInteractive={false}
        />
        <MiniMap
          className="!overflow-hidden !rounded-lg !border !border-gray-200 !bg-gray-100"
          nodeColor={(n) => {
            if (n.type === "userNode") return "#00C2CB";
            if (n.type === "repoNode") return "#6C63FF";
            if (n.type === "serverNode") return "#00C2CB";
            if (n.type === "dbNode") return "#EF4444";
            return "#64748b";
          }}
          maskColor="rgba(255,255,255,0.7)"
        />
      </ReactFlow>
    </div>
  );
}

export function BlastRadiusFlow() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
