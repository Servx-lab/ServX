import { supabaseAdmin } from '../../utils/supabaseAdmin';

export interface ProjectGroup {
  id: string;
  name: string;
  assets: {
    type: 'repo' | 'hosting' | 'db';
    id: string;
    provider?: string;
    url?: string;
  }[];
}

/**
 * Fetch all project groups for a given user.
 */
export async function getUserProjectGroups(userId: string): Promise<ProjectGroup[]> {
  const { data, error } = await supabaseAdmin
    .from('project_groups')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('[GroupsService] Failed to fetch groups:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Save or update a project group.
 */
export async function saveProjectGroup(
  userId: string,
  group: Partial<ProjectGroup>
): Promise<ProjectGroup | null> {
  const { data, error } = await supabaseAdmin
    .from('project_groups')
    .upsert({
      id: group.id,
      user_id: userId,
      name: group.name,
      assets: group.assets || [],
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('[GroupsService] Failed to save group:', error.message);
    throw error;
  }

  return data;
}

/**
 * Delete a project group.
 */
export async function deleteProjectGroup(userId: string, groupId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('project_groups')
    .delete()
    .eq('id', groupId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}
