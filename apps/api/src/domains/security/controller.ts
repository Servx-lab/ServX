import * as svc from './service';

/**
 * Trigger a dynamic target scan for a given URL.
 */
export async function scanTarget(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const { url } = req.body;

    if (!url) {
      throw new ValidationError('A target URL is required for scanning.');
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      throw new ValidationError('Invalid target URL format.');
    }

    console.log(`[Security] Triggering scan for: ${url} (User: ${req.user.uid})`);
    
    // Perform the scan
    const findings = await scanLiveDeployment(url);

    res.json({
      success: true,
      url,
      timestamp: new Date().toISOString(),
      score: findings.length === 0 ? 100 : Math.max(0, 100 - findings.length * 20),
      findings
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Fetch all project groups for the authenticated user.
 */
export async function listGroups(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const groups = await svc.getUserProjectGroups(req.user.uid);
    res.json(groups);
  } catch (err) {
    next(err);
  }
}

/**
 * Create or update a project group.
 */
export async function saveGroup(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const group = await svc.saveProjectGroup(req.user.uid, req.body);
    res.json(group);
  } catch (err) {
    next(err);
  }
}

/**
 * Delete a project group.
 */
export async function deleteGroup(req: any, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    await svc.deleteProjectGroup(req.user.uid, id);
    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (err) {
    next(err);
  }
}
