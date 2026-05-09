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
export async function searchUsers(q: string): Promise<SafeUserSearchHit[]> {
  const trimmed = (q || '').trim();
  if (trimmed.length < 3) {
    return [];
  }

  const limit = 100;
  const resultsMap = new Map<string, SafeUserSearchHit>();

  console.log(`[Users] Comprehensive search for: "${trimmed}"`);

  // 1. Search in user_profiles (Public profiles)
  try {
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, display_name, avatar_url')
      .or(`email.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`)
      .limit(limit);

    if (profileError) {
      console.error('[Users] Profile search error:', profileError.message);
    } else if (profiles) {
      profiles.forEach((u: any) => {
        resultsMap.set(u.id, {
          id: u.id,
          email: u.email || '',
          name: u.display_name || '',
          avatarUrl: u.avatar_url || undefined,
        });
      });
    }
  } catch (err) {
    console.error('[Users] Profile search failed:', err);
  }

  // 2. Search in Supabase Auth (Admin)
  try {
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    if (!authError && authUsers) {
      const queryLower = trimmed.toLowerCase();
      const foundInAuth = authUsers.filter(u =>
        (u.email?.toLowerCase().includes(queryLower)) ||
        (u.user_metadata?.full_name?.toLowerCase().includes(queryLower)) ||
        (u.user_metadata?.name?.toLowerCase().includes(queryLower)) ||
        (u.user_metadata?.display_name?.toLowerCase().includes(queryLower))
      );

      foundInAuth.forEach((au) => {
        if (!resultsMap.has(au.id)) {
          resultsMap.set(au.id, {
            id: au.id,
            email: au.email || '',
            name: au.user_metadata?.full_name || au.user_metadata?.name || au.user_metadata?.display_name || au.email?.split('@')[0] || '',
            avatarUrl: au.user_metadata?.avatar_url || undefined,
          });
        }
      });
    }
  } catch (err) {
    console.error('[Users] Auth search failed:', err);
  }

  const finalResults = Array.from(resultsMap.values()).slice(0, limit);
  console.log(`[Users] Found ${finalResults.length} total unique results`);
  return finalResults;
}

