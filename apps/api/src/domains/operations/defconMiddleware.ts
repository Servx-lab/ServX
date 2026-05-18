import type { Request, Response, NextFunction } from 'express';
import { getLocalDefconState } from './defconService';

/**
 * Top-level Express middleware to reject write operations during system lockdown.
 */
export function defconMiddleware(req: Request, res: Response, next: NextFunction): void {
  const state = getLocalDefconState();
  const isLockdown = state === 1 || state === 3;

  if (isLockdown) {
    const isDefconRoute = req.originalUrl.includes('/operations/defcon') || req.path.includes('/operations/defcon');
    
    if (['POST', 'PUT', 'DELETE'].includes(req.method) && !isDefconRoute) {
      console.warn(`[DEFCON] 🛡️ Blocked ${req.method} ${req.originalUrl} - System in Lockdown`);
      res.status(403).json({
        error: 'Forbidden',
        message: 'System Lockdown - Write operations are temporarily suspended.',
      });
      return;
    }
  }

  next();
}
