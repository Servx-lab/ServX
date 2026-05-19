import crypto from 'crypto';
import { supabaseAdmin } from '../../utils/supabaseAdmin';
import { encryptToken } from '../../utils/crypto';
import { getGithubToken } from '../github/service';

/**
 * Registers a repository and generates a SERVX_PIN.
 */
export async function registerRepository(
  userId: string,
  githubRepoId: string,
  githubRepoFullName: string
): Promise<{ servx_pin: string }> {
  // Fetch user's GitHub token
  const { accessToken } = await getGithubToken(userId);
  if (!accessToken) {
    throw new Error('No GitHub token found for user.');
  }

  // Generate a random PIN
  const servxPin = 'svx_' + crypto.randomBytes(12).toString('hex');

  // Encrypt the token for this repository
  const { iv, encryptedData, authTag } = encryptToken(accessToken);

  const { data, error } = await supabaseAdmin
    .from('servx_repositories')
    .insert({
      user_uuid: userId,
      github_repo_id: githubRepoId,
      github_repo_full_name: githubRepoFullName,
      servx_pin: servxPin,
      encrypted_github_token: encryptedData,
      github_token_iv: iv,
      github_token_auth_tag: authTag,
      is_maintenance: false
    })
    .select('servx_pin')
    .single();

  if (error) {
    if (error.code === '23505') {
       throw new Error('This repository is already registered to your account.');
    }
    throw error;
  }

  return { servx_pin: data.servx_pin };
}

/**
 * Toggles maintenance mode for a specific PIN.
 */
export async function toggleMaintenance(
  userId: string,
  servxPin: string,
  isMaintenance: boolean
): Promise<void> {
  const { error, count } = await supabaseAdmin
    .from('servx_repositories')
    .update({ is_maintenance: isMaintenance, updated_at: new Date().toISOString() })
    .eq('user_uuid', userId)
    .eq('servx_pin', servxPin);

  if (error) {
    throw error;
  }
}

/**
 * Public SDK endpoint to check maintenance mode status.
 */
export async function checkMaintenance(servxPin: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('servx_repositories')
    .select('is_maintenance')
    .eq('servx_pin', servxPin)
    .single();

  if (error || !data) {
    return false;
  }

  return data.is_maintenance;
}

/**
 * Fetches all active ServX registered repositories for the user.
 */
export async function getUserRepositories(userId: string) {
   const { data, error } = await supabaseAdmin
    .from('servx_repositories')
    .select('github_repo_id, github_repo_full_name, servx_pin, is_maintenance, created_at')
    .eq('user_uuid', userId)
    .order('created_at', { ascending: false });

   if (error) throw error;
   return data;
}
