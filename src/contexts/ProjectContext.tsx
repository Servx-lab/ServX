import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import apiClient from '@/lib/apiClient';

export type ProviderType = 'render' | 'vercel';

export interface Project {
  id: string;
  name: string;
  provider: ProviderType;
  status: string;
  framework: string;
}

export interface KillSwitchState {
  maintenance: boolean;
  flags: { imageUploads: boolean; aiFeatures: boolean; newSignups: boolean };
}

interface ProjectContextType {
  projects: Project[];
  isLoadingProjects: boolean;
  selectedProjectId: string | null;
  selectedProject: Project | null;
  setSelectedProject: (id: string) => void;
  killSwitchOverrides: Partial<Record<string, KillSwitchState>>;
  setKillSwitchOverride: (projectId: string, state: KillSwitchState) => void;
  bannedIps: Partial<Record<string, Set<string>>>;
  banIp: (projectId: string, ip: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: React.ReactNode }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [killSwitchOverrides, setKillSwitchOverrides] = useState<Partial<Record<string, KillSwitchState>>>({});
  const [bannedIps, setBannedIps] = useState<Partial<Record<string, Set<string>>>>({});

  useEffect(() => {
    let cancelled = false;
    setIsLoadingProjects(true);
    apiClient
      .get('/operations/projects')
      .then((res) => {
        if (cancelled) return;
        const list = res.data?.projects || [];
        setProjects(list);
        setSelectedProjectId((prev) => (list.length > 0 && !prev ? list[0].id : prev));
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[ProjectContext] Failed to fetch projects:', err);
          setProjects([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingProjects(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? projects[0] ?? null;

  const setSelectedProject = useCallback((id: string) => {
    setSelectedProjectId(id);
  }, []);

  const setKillSwitchOverride = useCallback((projectId: string, state: KillSwitchState) => {
    setKillSwitchOverrides((prev) => ({ ...prev, [projectId]: state }));
  }, []);

  const banIp = useCallback((projectId: string, ip: string) => {
    setBannedIps((prev) => {
      const set = new Set(prev[projectId] ?? []);
      set.add(ip);
      return { ...prev, [projectId]: set };
    });
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        isLoadingProjects,
        selectedProjectId,
        selectedProject,
        setSelectedProject,
        killSwitchOverrides,
        setKillSwitchOverride,
        bannedIps,
        banIp,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return ctx;
};
