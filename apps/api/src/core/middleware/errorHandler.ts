import type { Request, Response, NextFunction } from 'express';

import { isAppError } from '@servx/errors';

const autoMedicMiddleware = require('../../../middleware/autoMedicMiddleware');

const errorHandler = async (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (isAppError(err)) {
    res.status(err.statusCode).json({ error: err.code, message: err.message });
    return;
  }

  // Non-operational error: run Auto-Medic analysis pipeline, then fall back to 500
  console.error('[errorHandler] Unhandled error:', err);

  try {
    await new Promise<void>((resolve, reject) => {
      autoMedicMiddleware(err, req, res, (passedErr: unknown) => {
        if (passedErr) {
          reject(passedErr);
        } else {
          resolve();
        }
      });
    });
  } catch {
    // autoMedicMiddleware failed or called next(err) — send plain 500
    if (!res.headersSent) {
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  }
};

export default errorHandler;
