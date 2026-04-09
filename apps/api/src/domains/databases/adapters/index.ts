import type { UserConnectionProvider } from '@servx/types';
import type { IDbAdapter } from './base.adapter';

import { MongoDbAdapter } from './mongodb.adapter';
import { PostgresAdapter } from './postgres.adapter';
import { MySqlAdapter } from './mysql.adapter';
import { RedisAdapter } from './redis.adapter';
import { FirebaseAdapter } from './firebase.adapter';
import { SupabaseAdapter } from './supabase.adapter';
import { OracleAdapter } from './oracle.adapter';

export function resolveAdapter(provider: UserConnectionProvider, config: Record<string, unknown>): IDbAdapter {
  switch (provider) {
    case 'MongoDB':
      return new MongoDbAdapter(config);
    case 'PostgreSQL':
    case 'AWS RDS':
      return new PostgresAdapter(config);
    case 'MySQL':
    case 'MariaDB':
      return new MySqlAdapter(config);
    case 'Oracle':
      return new OracleAdapter(config);
    case 'Redis':
      return new RedisAdapter(config);
    case 'Firebase':
      return new FirebaseAdapter(config);
    case 'Supabase':
      return new SupabaseAdapter(config);
    default:
      throw new Error(`No database adapter implemented for provider: ${provider}`);
  }
}
