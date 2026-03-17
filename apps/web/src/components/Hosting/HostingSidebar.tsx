import React from 'react';
import { NavLink } from 'react-router-dom';
import { Cloud, Server, Box, Globe, Cpu } from 'lucide-react';

const providers = [
    { name: 'Render', icon: Cloud, path: '/hosting/render' },
    { name: 'Vercel', icon: Globe, path: '/hosting/vercel' },
    { name: 'AWS', icon: Server, path: '/hosting/aws' },
    { name: 'Railway', icon: Box, path: '/hosting/railway' },
    { name: 'DigitalOcean', icon: Cpu, path: '/hosting/digitalocean' },
    { name: 'Fly.io', icon: Globe, path: '/hosting/fly' },
];

const HostingSidebar = () => {
    return (
        <div className="w-64 h-full border-r border-gray-200 bg-gray-50 flex flex-col pt-6 pb-4">
            <div className="px-6 mb-6">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Providers</h2>
            </div>
            <nav className="flex-1 space-y-1 px-3">
                {providers.map((provider) => (
                    <NavLink
                        key={provider.name}
                        to={provider.path}
                        className={({ isActive }) => `
                            flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200
                            ${isActive 
                                ? 'bg-blue-50 text-blue-600 font-medium' 
                                : 'text-gray-500 hover:bg-gray-100 hover:text-black'
                            }
                        `}
                    >
                        <provider.icon className="w-4 h-4" />
                        <span>{provider.name}</span>
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};

export default HostingSidebar;