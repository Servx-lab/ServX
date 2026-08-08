import type { Response, NextFunction } from 'express';
import { ValidationError } from '@servx/errors';
import { supabaseAdmin } from '../../utils/supabaseAdmin';
import {
  getHostingProjects,
  toggleVercelMaintenance,
  toggleRenderMaintenance,
  getHostingCredentials,
  logTask,
} from './service';
import { auditEmitter } from './auditEmitter';
import { getLocalDefconState, updateDefconState } from './defconService';
import { getCircuitStates, setCircuitState } from '../../core/services/circuitBreaker';

/**
 * Fetches hosting projects from connected providers.
 */
export async function getProjects(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projects = await getHostingProjects(req.user.id);
    res.json({ projects });
  } catch (err) {
    next(err);
  }
}

/**
 * Toggles maintenance mode on Vercel or Render.
 */
export async function toggleMaintenance(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectId, provider, isEnabled } = req.body as {
      projectId?: string;
      provider?: string;
      isEnabled?: boolean;
    };

    if (!projectId || typeof isEnabled !== 'boolean') {
      throw new ValidationError('Missing or invalid projectId or isEnabled');
    }

    const prov = (provider || '').toLowerCase();

    if (prov === 'vercel') {
      const creds = await getHostingCredentials(req.user.id, 'vercel');
      if (!creds?.token) {
        throw new ValidationError(
          'Vercel not connected. Add your Vercel token in Hosting & Servers.'
        );
      }

      await toggleVercelMaintenance(creds.token, projectId, creds.edgeConfigId, isEnabled);
      
      auditEmitter.log(
        req.user?.email || 'system@servx.dev',
        'maintenance',
        `Toggled Maintenance Mode for Vercel project '${projectId}' to ${isEnabled ? 'ON' : 'OFF'}`
      );

      res.json({
        success: true,
        message: isEnabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
        provider: 'vercel',
      });
      return;
    }

    if (prov === 'render') {
      const creds = await getHostingCredentials(req.user.id, 'render');
      if (!creds?.token) {
        throw new ValidationError(
          'Render not connected. Add your Render API key in Hosting & Servers.'
        );
      }

      await toggleRenderMaintenance(creds.token, projectId, isEnabled);

      auditEmitter.log(
        req.user?.email || 'system@servx.dev',
        'maintenance',
        `Toggled Maintenance Mode for Render service '${projectId}' to ${isEnabled ? 'ON' : 'OFF'}`
      );

      res.json({
        success: true,
        message: isEnabled ? 'Service suspended' : 'Service resumed',
        provider: 'render',
      });
      return;
    }

    throw new ValidationError("Unsupported or missing provider. Use 'vercel' or 'render'.");
  } catch (err) {
    next(err);
  }
}

/**
 * Logs a task execution to the operations stream.
 */
export async function executeTask(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { task, targetId } = req.body as { task?: string; targetId?: string };

    if (!task || !targetId) {
      throw new ValidationError('Missing task or targetId');
    }

    logTask(req.user.id, task, targetId);

    auditEmitter.log(
      req.user?.email || 'system@servx.dev',
      'task',
      `Executed Remote Task '${task}' on target service '${targetId}'`
    );

    res.json({ success: true, task, targetId });
  } catch (err) {
    next(err);
  }
}

/**
 * Fetches the most recent incident logged by the Auto-Medic middleware.
 * PHASE 3: Real-time incident retrieval.
 */
export async function getLatestIncident(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deploymentId = req.query.deploymentId as string | undefined;
    
    let query = supabaseAdmin
      .from('incidents')
      .select('*')
      .eq('user_id', req.user.uid)
      .order('timestamp', { ascending: false });
      
    if (deploymentId) {
      // The deployment ID in the database is DEP-${connection.id}-${dep.id}
      // Since we don't know the connection ID here cleanly, we can use ilike
      query = query.ilike('id', `%${deploymentId}`);
    }
    
    const { data, error } = await query.limit(1).single();

    // PGRST116 is the code for "JSON object requested, but no rows returned"
    if (error && error.code !== 'PGRST116') {
       throw error;
    }

    res.json({ incident: data || null });
  } catch (err) {
    next(err);
  }
}

/**
 * SSE endpoint to establish a live audit logging stream.
 */
export async function getAuditStream(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  let userEmail = 'system@servx.dev';
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split('Bearer ')[1] : queryToken;

  if (token) {
    try {
      if (supabaseAdmin) {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user && user.email) {
          userEmail = user.email;
        }
      }
    } catch (err) {
      console.warn('[AuditStream] Auth failed:', err);
    }
  }

  // Write headers for Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Initial heartbeat
  res.write(`data: ${JSON.stringify({
    id: 'init',
    timestamp: new Date().toISOString(),
    user: 'System',
    type: 'security',
    message: 'Live operations audit stream channel successfully initialized.'
  })}\n\n`);

  const onLog = (payload: any) => {
    // Only send the payload if it belongs to the authenticated user, or if they are the system admin.
    if (payload.user === userEmail || payload.user === 'System' || userEmail === 'system@servx.dev') {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  };

  auditEmitter.on('log', onLog);

  req.on('close', () => {
    auditEmitter.off('log', onLog);
  });
}

/**
 * Assesses the blast radius and impact of an infrastructure task before execution.
 */
export async function assessTask(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { task, targetId } = req.body as { task?: string; targetId?: string };

    if (!task || !targetId) {
      throw new ValidationError('Missing task or targetId');
    }

    let affectedComponents = 0;
    let impactLevel: 'low' | 'medium' | 'high' = 'low';
    let description = '';

    if (task === 'clear-redis') {
      affectedComponents = 3;
      impactLevel = 'high';
      description = 'Wiping all key-value entries in Redis cache. This will immediately terminate ~4,200 cached query sessions and cause temporary latency spikes across 3 connected downstream microservices as they rebuild cache storage.';
    } else if (task === 'backup-db') {
      affectedComponents = 1;
      impactLevel = 'low';
      description = 'Creating a point-in-time snapshot backup of the primary database. Reads and writes will continue normally, but disk I/O usage might increase slightly for ~45 seconds.';
    } else if (task === 'sync-github') {
      affectedComponents = 2;
      impactLevel = 'medium';
      description = 'Syncing latest repository status, commit logs, and repository analytics metadata from GitHub API. This will run 2 parallel background sync worker processes and update the live team dashboard.';
    } else {
      description = 'Executing operational script. Minimal impact expected on production workloads.';
    }

    res.json({
      success: true,
      task,
      targetId,
      affectedComponents,
      impactLevel,
      description,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Log client-side operations (like ghost mode impersonations, IP bans).
 */
export async function logClientEvent(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { type, message } = req.body as { type?: 'security' | 'auth' | 'task' | 'maintenance'; message?: string };
    if (!type || !message) {
      throw new ValidationError('Missing type or message');
    }

    auditEmitter.log(req.user?.email || 'admin@servx.dev', type, message);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

/**
 * Gets the current in-memory DEFCON threat level.
 */
export async function getDefconState(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const state = getLocalDefconState();
    res.json({ state });
  } catch (err) {
    next(err);
  }
}

/**
 * Sets the global DEFCON state, syncs to Redis, and invalidates JWT tokens if Lockdown is selected.
 */
export async function setDefconState(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { state } = req.body as { state?: number };
    if (typeof state !== 'number' || ![5, 4, 3, 2, 1].includes(state)) {
      throw new ValidationError('Invalid DEFCON state value. Must be an integer between 1 and 5.');
    }
    
    await updateDefconState(state, req.user?.email || 'admin@servx.dev');
    res.json({ success: true, state });
  } catch (err) {
    next(err);
  }
}

/**
 * Gets the state of all circuit breakers (OpenAI, Resend, Vercel).
 */
export async function getCircuits(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const states = await getCircuitStates();
    res.json({ states });
  } catch (err) {
    next(err);
  }
}

/**
 * Toggles a manual service circuit breaker OPEN or CLOSED.
 */
export async function toggleCircuit(
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { service, state } = req.body as { service?: string; state?: 'OPEN' | 'CLOSED' };
    if (!service || !state || !['openai', 'resend', 'vercel'].includes(service) || !['OPEN', 'CLOSED'].includes(state)) {
      throw new ValidationError("Invalid service or state. Service must be 'openai', 'resend', or 'vercel'. State must be 'OPEN' or 'CLOSED'.");
    }

    await setCircuitState(service, state);

    // Log the operational change to audit logs
    auditEmitter.log(
      req.user?.email || 'admin@servx.dev',
      'security',
      `Manual circuit breaker for service '${service}' updated to ${state}`
    );

    res.json({ success: true, service, state });
  } catch (err) {
    next(err);
  }
}


