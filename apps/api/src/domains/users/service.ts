import { supabaseAdmin } from '../../utils/supabaseAdmin';

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
 * ILIKE search on Supabase user profiles. Returns safe fields only.
 */
export async function searchUsers(q: string, limit = 20): Promise<SafeUserSearchHit[]> {
  const trimmed = (q || '').trim();
  if (trimmed.length < 2) {
    return [];
  }

  const { data: users, error } = await supabaseAdmin
    .from('user_profiles')
    .select('id, email, display_name, avatar_url')
    .or(`email.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`)
    .limit(Math.min(limit, 50));

  if (error || !users) {
    return [];
  }

  return users.map((u) => ({
    id: u.id,
    email: u.email || '',
    name: u.display_name || '',
    avatarUrl: u.avatar_url || undefined,
  }));
}

