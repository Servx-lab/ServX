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
    const { data, error } = await supabaseAdmin
      .from('incidents')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single();

    // PGRST116 is the code for "JSON object requested, but no rows returned"
    if (error && error.code !== 'PGRST116') {
       throw error;
    }

    res.json({ incident: data || null });
  } catch (err) {
    next(err);
  }
}
