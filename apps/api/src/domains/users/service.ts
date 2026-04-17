import { User } from '../admin/model';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface SafeUserSearchHit {
  id: string;
  email: string;
  name: string;
  username?: string;
  avatarUrl?: string;
}

/**
 * Regex search on Mongo users (synced from Firebase). Returns safe fields only.
 */
export async function searchUsers(q: string, limit = 20): Promise<SafeUserSearchHit[]> {
  const trimmed = (q || '').trim();
  if (trimmed.length < 2) {
    return [];
  }

  const rx = new RegExp(escapeRegex(trimmed), 'i');

  const users = await (User as any)
    .find({
      $or: [{ email: rx }, { username: rx }, { name: rx }],
    })
    .limit(Math.min(limit, 50))
    .select('uid email name username avatarUrl')
    .lean();

  return (users as any[]).map((u) => ({
    id: u.uid as string,
    email: (u.email as string) || '',
    name: (u.name as string) || '',
    username: u.username as string | undefined,
    avatarUrl: u.avatarUrl as string | undefined,
  }));
}
