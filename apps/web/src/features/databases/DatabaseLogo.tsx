import React from 'react';
import { DatabaseType } from './types';
import { Database } from 'lucide-react';
import { FaAws, FaDatabase } from 'react-icons/fa';
import {
  SiFirebase,
  SiGooglesheets,
  SiMariadb,
  SiMongodb,
  SiMysql,
  SiPostgresql,
  SiRedis,
  SiSupabase,
  SiVercel,
} from 'react-icons/si';
import type { IconType } from 'react-icons';

interface DatabaseLogoProps {
  type: DatabaseType | 'All' | string;
  className?: string;
}

const PROVIDER_ICONS: Record<string, IconType> = {
  Firebase: SiFirebase,
  MongoDB: SiMongodb,
  Supabase: SiSupabase,
  MySQL: SiMysql,
  PostgreSQL: SiPostgresql,
  'AWS RDS': FaAws,
  AWS: FaAws,
  Redis: SiRedis,
  MariaDB: SiMariadb,
  Oracle: FaDatabase,
  'Google Sheets': SiGooglesheets,
  Vercel: SiVercel,
};

const PROVIDER_COLORS: Record<string, string> = {
  Firebase: '#FFCA28',
  MongoDB: '#00ED64',
  Supabase: '#3ECF8E',
  MySQL: '#4479A1',
  PostgreSQL: '#4169E1',
  'AWS RDS': '#FF9900',
  AWS: '#FF9900',
  Redis: '#DC382D',
  MariaDB: '#003545',
  Oracle: '#F80000',
  'Google Sheets': '#34A853',
  Vercel: '#111111',
};

export const DatabaseLogo: React.FC<DatabaseLogoProps> = ({ type, className = "w-6 h-6" }) => {
  const BrandIcon = PROVIDER_ICONS[type];

  if (BrandIcon) {
    const color = PROVIDER_COLORS[type] || '#6B7280';
    return <BrandIcon className={className} style={{ color }} aria-label={`${type} logo`} />;
  }

  return <Database className={className} aria-label={`${type} logo`} />;
};
