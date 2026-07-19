import { useEffect } from "react";
import apiClient from "@/lib/apiClient";

/**
 * Starts the free-tier executor while the user is entering ServX. It is
 * deliberately fire-and-forget: a sleeping or unavailable executor must never
 * block the dashboard, and the job-create endpoint still performs its own wake.
 */
const AttackPathsWarmup = () => {
  useEffect(() => {
    void apiClient.post("/attack-paths/warmup").catch(() => undefined);
  }, []);

  return null;
};

export default AttackPathsWarmup;
