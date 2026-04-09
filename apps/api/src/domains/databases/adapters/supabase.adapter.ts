/**
 * supabase.adapter.ts
 * Adapter for Supabase using @supabase/supabase-js (service_role key).
 * Uses the PostgREST layer to list tables and query rows.
 * Also queries information_schema via the REST API for table metadata.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { IDbAdapter, AdapterDatabase, AdapterTable, DbStats } from './base.adapter';

interface SupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

export class SupabaseAdapter implements IDbAdapter {
  private readonly client: SupabaseClient;
  private readonly projectUrl: string;

  constructor(config: Record<string, unknown>) {
    const c = config as Partial<SupabaseConfig>;
    if (!c.url || !c.serviceRoleKey) {
      throw new Error('Supabase adapter requires url and serviceRoleKey');
    }
    this.projectUrl = c.url;
    this.client = createClient(c.url, c.serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  /**
   * Supabase is a single logical project, so we return one pseudo-database
   * named after the project URL's subdomain.
   */
  async listDatabases(): Promise<AdapterDatabase[]> {
    const subdomain = this.projectUrl.replace('https://', '').split('.')[0];
    return [{ name: subdomain }];
  }

  async listTables(dbName: string): Promise<AdapterTable[]> {
    // Fetch table list from information_schema via RPC (Supabase exposes it)
    const { data, error } = await this.client.rpc('list_tables').select('*');

    // Fallback: query information_schema directly via the REST layer
    if (error || !data) {
      const { data: tables, error: tableError } = await this.client
        .from('information_schema.tables')
        .select('table_name, table_type')
        .eq('table_schema', 'public');

      if (tableError) {
        // Last resort: try querying pg_tables via supabase-js (works if service role)
        throw new Error(`Cannot list Supabase tables: ${tableError.message}`);
      }
      return ((tables as any[]) || []).map((t: any) => ({
        name: t.table_name,
        type: t.table_type === 'VIEW' ? 'view' : 'table',
      }));
    }

    return ((data as any[]) || []).map((t: any) => ({
      name: t.table_name,
      type: t.table_type === 'VIEW' ? 'view' : 'table',
    }));
  }

  async queryRows(dbName: string, table: string, limit = 50): Promise<unknown[]> {
    const { data, error } = await this.client.from(table).select('*').limit(limit);
    if (error) throw new Error(`Supabase query error: ${error.message}`);
    return data ?? [];
  }

  async ping(): Promise<true> {
    const { error } = await this.client.from('_dummy_ping_check_').select('*').limit(1);
    // A "relation does not exist" error means auth worked and the DB is reachable
    if (error && !error.message.includes('does not exist') && !error.message.includes('relation')) {
      throw new Error(`Supabase ping failed: ${error.message}`);
    }
    return true;
  }

  async getStats(): Promise<DbStats> {
    // Supabase doesn't expose server stats directly; return project-level info
    return {
      extra: {
        projectUrl: this.projectUrl,
        note: 'Detailed stats available in the Supabase Dashboard',
      },
    };
  }
}
