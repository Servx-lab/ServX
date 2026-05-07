/**
 * Mock data keyed by repository — drives all widgets when selection changes.
 */

export type RepoId = "zync" | "quizwhiz";

export const REPO_OPTIONS: { id: RepoId; label: string }[] = [
  { id: "zync", label: "Zync Repo" },
  { id: "quizwhiz", label: "QuizWhiz Repo" },
];

export type AccessLevel = "admin" | "write" | "read";

export type NetworkUser = {
  id: string;
  name: string;
  access: AccessLevel;
};

export type RepoSecurityData = {
  outdatedPackages: number;
  connectedDevices: number;
  gmailLastMonth: number;
  lastMonthChanges: { count: number; pct: number; up: boolean };
  activeDevelopers: number;
  cicdSuccess: number;
  vulnerabilities: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  /** Percentages for bars (sum ~100) */
  vulnPct: { critical: number; high: number; medium: number; low: number };
  usersCriticalAccess: { id: string; name: string; role: string; avatar?: string }[];
  networkUsers: NetworkUser[];
  insights: {
    id: string;
    tone: "critical" | "high" | "deploy";
    title: string;
    lines: [string, string];
  }[];
};

export const MOCK_BY_REPO: Record<RepoId, RepoSecurityData> = {
  zync: {
    outdatedPackages: 24,
    connectedDevices: 12,
    gmailLastMonth: 842,
    lastMonthChanges: { count: 156, pct: 18, up: true },
    activeDevelopers: 8,
    cicdSuccess: 94,
    vulnerabilities: { total: 47, critical: 12, high: 18, medium: 14, low: 3 },
    vulnPct: { critical: 26, high: 38, medium: 30, low: 6 },
    usersCriticalAccess: [
      { id: "u1", name: "Alex Rivera", role: "Admin · deploy keys" },
      { id: "u2", name: "Morgan Chen", role: "Write · production" },
      { id: "u3", name: "Sam Okonkwo", role: "Admin · org owner" },
    ],
    networkUsers: [
      { id: "nu1", name: "Alex Rivera", access: "admin" },
      { id: "nu2", name: "Jordan Lee", access: "write" },
      { id: "nu3", name: "Priya Shah", access: "read" },
      { id: "nu4", name: "Dev Bot", access: "write" },
      { id: "nu5", name: "Contractor X", access: "read" },
    ],
    insights: [
      {
        id: "i1",
        tone: "critical",
        title: "Critical CVE Found",
        lines: [
          "express@4.19.2 — prototype pollution (GHSA-qw6h-64r8-5gw6) · CVSS 9.8",
          "Impacted: apps/api/src/server.ts, package-lock.json chain",
        ],
      },
      {
        id: "i2",
        tone: "high",
        title: "High Risk User Access",
        lines: [
          "Morgan Chen — write on main + secrets scope on Vercel project zync-web",
          "Last elevated: 4d ago · no MFA on IdP session",
        ],
      },
      {
        id: "i3",
        tone: "deploy",
        title: "Deployment Misconfiguration",
        lines: [
          "Vercel: NODE_ENV=development leaked in preview env for branch feat/billing",
          "Render: health check path /healthz returns 500 under load",
        ],
      },
    ],
  },
  quizwhiz: {
    outdatedPackages: 11,
    connectedDevices: 7,
    gmailLastMonth: 1203,
    lastMonthChanges: { count: 89, pct: 7, up: false },
    activeDevelopers: 5,
    cicdSuccess: 88,
    vulnerabilities: { total: 22, critical: 3, high: 8, medium: 9, low: 2 },
    vulnPct: { critical: 14, high: 36, medium: 41, low: 9 },
    usersCriticalAccess: [
      { id: "u1", name: "Riley Park", role: "Admin" },
      { id: "u2", name: "Casey Kim", role: "Write · staging" },
    ],
    networkUsers: [
      { id: "nu1", name: "Riley Park", access: "admin" },
      { id: "nu2", name: "Casey Kim", access: "write" },
      { id: "nu3", name: "Open Source Bot", access: "read" },
      { id: "nu4", name: "QA Team", access: "read" },
    ],
    insights: [
      {
        id: "i1",
        tone: "critical",
        title: "Critical CVE Found",
        lines: [
          "lodash@4.17.20 — advisory in legacy quiz bundle · CVSS 7.4",
          "Impacted: apps/web/src/legacy/quizUtils.ts",
        ],
      },
      {
        id: "i2",
        tone: "high",
        title: "High Risk User Access",
        lines: [
          "Guest collaborator with write on default branch (invited 30d ago)",
          "No branch protection on quiz-editor",
        ],
      },
      {
        id: "i3",
        tone: "deploy",
        title: "Deployment Misconfiguration",
        lines: [
          "Firebase rules allow unauthenticated read on /quizzes/dev",
          "Fly.io: min machines = 0 causing cold-start auth failures",
        ],
      },
    ],
  },
};
