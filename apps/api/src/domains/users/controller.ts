import type { Request, Response, NextFunction } from 'express';

import { ValidationError } from '@servx/errors';

import { searchUsers } from './service';

interface AdminRequest extends Request {
  uid?: string;
}

export async function getUserSearch(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    if (q.length > 200) {
      throw new ValidationError('Search query is too long');
    }
    const users = await searchUsers(q);
    res.json({ users });
  } catch (err) {
    next(err);
  }
}
