import { useState, useEffect } from 'react';
import { Activity, Server, Clock, HardDrive, Database } from 'lucide-react';
import { getStats } from './api';

interface StatsPanelProps {
  connectionId: string;
}

export function StatsPanel({ connectionId }: StatsPanelProps) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      setLoading(true);
      try {
        const { stats: resStats } = await getStats(connectionId);
        if (mounted) {
          setStats(resStats);
        }
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [connectionId]);

  if (loading && !stats) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/50 text-xs text-muted-foreground animate-pulse">
        <Activity className="w-3 h-3" /> Fetching server metrics...
      </div>
    );
  }

  if (!stats) return null;

  const formatUptime = (seconds?: number) => {
    if (!seconds) return '-';
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-wrap items-center gap-6 px-4 py-2 border-b border-border/50 text-xs bg-muted/20">
      {/* Live Indicator */}
      <div className="flex items-center gap-2 font-medium">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
        Live Metrics
      </div>

      <div className="w-px h-4 bg-border"></div>

      {stats.version && (
        <div className="flex items-center gap-1.5 text-muted-foreground" title="Database Version">
          <Server className="w-3.5 h-3.5 opacity-70" />
          {stats.version}
        </div>
      )}

      {stats.uptime !== undefined && (
        <div className="flex items-center gap-1.5 text-muted-foreground" title="Server Uptime">
          <Clock className="w-3.5 h-3.5 opacity-70" />
          {formatUptime(stats.uptime)}
        </div>
      )}

      {stats.totalConnections !== undefined && (
        <div className="flex items-center gap-1.5 text-muted-foreground" title="Active Connections">
          <Activity className="w-3.5 h-3.5 opacity-70" />
          {stats.totalConnections} conns
        </div>
      )}

      {(stats.memoryUsedBytes !== undefined || stats.storageUsedBytes !== undefined) && (
        <div className="flex items-center gap-1.5 text-muted-foreground" title="Storage / Memory Used">
          <HardDrive className="w-3.5 h-3.5 opacity-70" />
          {formatBytes(stats.memoryUsedBytes || stats.storageUsedBytes)}
        </div>
      )}
      
      {stats.queryCount !== undefined && (
        <div className="flex items-center gap-1.5 text-muted-foreground" title="Queries Processed">
          <Database className="w-3.5 h-3.5 opacity-70" />
          {stats.queryCount.toLocaleString()} queries
        </div>
      )}

      {/* Show extra note if this provider doesn't have live numeric stats */}
      {stats.extra?.note && (
        <div className="flex items-center gap-1.5 text-muted-foreground italic ml-auto">
          {stats.extra.note}
        </div>
      )}
    </div>
  );
}
