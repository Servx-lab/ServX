import React from 'react';
import { NavLink } from 'react-router-dom';
import { FaAws } from 'react-icons/fa';
import {
  SiDigitalocean,
  SiFlydotio,
  SiRailway,
  SiRender,
  SiVercel,
} from 'react-icons/si';
import type { IconType } from 'react-icons';

/** Brand-accurate colors (Simple Icons / official guidelines) */
const providers: {
  name: string;
  path: string;
  Icon: IconType;
  brandColor: string;
}[] = [
  { name: 'Render', path: '/hosting/render', Icon: SiRender, brandColor: '#000000' },
  { name: 'Vercel', path: '/hosting/vercel', Icon: SiVercel, brandColor: '#000000' },
  { name: 'AWS', path: '/hosting/aws', Icon: FaAws, brandColor: '#FF9900' },
  { name: 'Railway', path: '/hosting/railway', Icon: SiRailway, brandColor: '#0B0D0E' },
  {
    name: 'DigitalOcean',
    path: '/hosting/digitalocean',
    Icon: SiDigitalocean,
    brandColor: '#0080FF',
  },
  { name: 'Fly.io', path: '/hosting/fly', Icon: SiFlydotio, brandColor: '#7B36ED' },
];

const HostingSidebar = () => {
  return (
    <div className="w-64 h-full border-r border-gray-200 bg-gray-50 flex flex-col pt-6 pb-4">
      <div className="px-6 mb-6">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Providers</h2>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {providers.map(({ name, path, Icon, brandColor }) => (
          <NavLink
            key={name}
            to={path}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium shadow-sm ring-1 ring-blue-100/80'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-gray-200/80"
                  aria-hidden
                >
                  <Icon className="h-4 w-4" style={{ color: brandColor }} />
                </span>
                <span className={isActive ? 'text-blue-800' : undefined}>{name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default HostingSidebar;
