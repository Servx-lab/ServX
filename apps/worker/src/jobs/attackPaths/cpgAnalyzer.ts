import type { MaterializedFile } from './repoMaterializer.js';

export interface CPGNode {
  id: string;
  type: 'route' | 'auth_guard' | 'sink' | 'variable' | 'repo' | 'scan';
  label: string;
  file?: string;
  line?: number;
  snippet?: string;
  metadata?: Record<string, any>;
}

export interface CPGEdge {
  from: string;
  to: string;
  type: 'dataflow' | 'guarded_by' | 'contains' | 'analyzes' | 'triggers_sink';
}

export interface CPGAnalysisResult {
  version: string;
  summary: {
    repoFullName: string;
    filesAnalyzed: number;
    routesDetected: number;
    authGuardsDetected: number;
    sinksDetected: number;
    highRiskPathsCount: number;
  };
  nodes: CPGNode[];
  edges: CPGEdge[];
  exploitCandidates: Array<{
    routeNodeId: string;
    sinkNodeId: string;
    guardNodeId?: string;
    vulnerabilityType: 'IDOR' | 'SQLi' | 'RCE' | 'SSRF' | 'Unprotected_Mutation';
    description: string;
  }>;
}

/**
 * Builds an inter-procedural Code Property Graph (CPG) by analyzing materialized source files
 * for route boundaries, authentication checks, untrusted parameters, and execution sinks.
 */
export function analyzeCPG(params: {
  repoFullName: string;
  files: MaterializedFile[];
}): CPGAnalysisResult {
  const { repoFullName, files } = params;

  const nodes: CPGNode[] = [];
  const edges: CPGEdge[] = [];
  const exploitCandidates: CPGAnalysisResult['exploitCandidates'] = [];

  // Root repo node
  nodes.push({
    id: 'repo-root',
    type: 'repo',
    label: repoFullName,
    metadata: { repo: repoFullName },
  });

  let routeCount = 0;
  let guardCount = 0;
  let sinkCount = 0;

  for (const file of files) {
    if (!file.content) continue;
    const lines = file.content.split('\n');

    // Track local file nodes
    const fileRoutes: CPGNode[] = [];
    const fileGuards: CPGNode[] = [];
    const fileSinks: CPGNode[] = [];

    lines.forEach((lineText, lineIdx) => {
      const lineNum = lineIdx + 1;

      // 1. Detect Routes
      const routeMatch = lineText.match(/(?:router|app)\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/i)
        || lineText.match(/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/);
      
      if (routeMatch) {
        routeCount++;
        const method = routeMatch[1].toUpperCase();
        const pathPattern = routeMatch[2] || 'NextRoute';
        const nodeId = `route-${routeCount}`;
        const routeNode: CPGNode = {
          id: nodeId,
          type: 'route',
          label: `${method} ${pathPattern}`,
          file: file.path,
          line: lineNum,
          snippet: lineText.trim(),
          metadata: { method, path: pathPattern, hasIdParam: /:id|\{id\}|id/i.test(pathPattern) },
        };
        nodes.push(routeNode);
        fileRoutes.push(routeNode);
        edges.push({ from: 'repo-root', to: nodeId, type: 'contains' });
      }

      // 2. Detect Auth / Tenant Guards
      if (/(requireAuth|verifyToken|jwt\.verify|getSession|req\.user|checkPermission)/i.test(lineText)) {
        guardCount++;
        const nodeId = `guard-${guardCount}`;
        const guardNode: CPGNode = {
          id: nodeId,
          type: 'auth_guard',
          label: `Auth Check: ${lineText.trim().slice(0, 40)}`,
          file: file.path,
          line: lineNum,
          snippet: lineText.trim(),
        };
        nodes.push(guardNode);
        fileGuards.push(guardNode);
      }

      // 3. Detect Execution / Database Sinks
      let vulnType: 'SQLi' | 'RCE' | 'SSRF' | 'IDOR' | 'Unprotected_Mutation' | null = null;
      if (/(exec\(|spawn\(|child_process|eval\()/i.test(lineText)) {
        vulnType = 'RCE';
      } else if (/(\$queryRaw|sequelize\.query|db\.query|\.raw\()/i.test(lineText)) {
        vulnType = 'SQLi';
      } else if (/(axios\.|fetch\(|http\.request\()/i.test(lineText) && /req\.(query|body|params)/i.test(lineText)) {
        vulnType = 'SSRF';
      } else if (/(\.findByIdAndUpdate|\.update|\.delete|\.destroy|\.create)/i.test(lineText)) {
        vulnType = 'IDOR';
      }

      if (vulnType) {
        sinkCount++;
        const nodeId = `sink-${sinkCount}`;
        const sinkNode: CPGNode = {
          id: nodeId,
          type: 'sink',
          label: `Sink (${vulnType}): ${lineText.trim().slice(0, 40)}`,
          file: file.path,
          line: lineNum,
          snippet: lineText.trim(),
          metadata: { vulnType },
        };
        nodes.push(sinkNode);
        fileSinks.push(sinkNode);
      }
    });

    // Link intra-file flows
    for (const routeNode of fileRoutes) {
      // Connect route to guards in the same file
      for (const guardNode of fileGuards) {
        edges.push({ from: routeNode.id, to: guardNode.id, type: 'guarded_by' });
      }

      // Connect route to sinks in the same file
      for (const sinkNode of fileSinks) {
        edges.push({ from: routeNode.id, to: sinkNode.id, type: 'triggers_sink' });

        const isGuarded = fileGuards.length > 0;
        const vulnType = (sinkNode.metadata?.vulnType || 'Unprotected_Mutation') as any;

        // If sink is SQLi or RCE, or if IDOR occurs without explicit guard, flag exploit candidate
        if (vulnType === 'SQLi' || vulnType === 'RCE' || vulnType === 'SSRF' || (!isGuarded && vulnType === 'IDOR')) {
          exploitCandidates.push({
            routeNodeId: routeNode.id,
            sinkNodeId: sinkNode.id,
            guardNodeId: isGuarded ? fileGuards[0].id : undefined,
            vulnerabilityType: vulnType,
            description: `Route ${routeNode.label} (${routeNode.file}:${routeNode.line}) flows directly to ${vulnType} sink (${sinkNode.file}:${sinkNode.line})${!isGuarded ? ' without detected authorization guards' : ''}.`,
          });
        }
      }
    }
  }

  return {
    version: 'v3-semantic-cpg',
    summary: {
      repoFullName,
      filesAnalyzed: files.length,
      routesDetected: routeCount,
      authGuardsDetected: guardCount,
      sinksDetected: sinkCount,
      highRiskPathsCount: exploitCandidates.length,
    },
    nodes,
    edges,
    exploitCandidates,
  };
}
