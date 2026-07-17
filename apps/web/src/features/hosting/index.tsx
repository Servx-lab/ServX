import React from 'react';
import { useParams } from 'react-router-dom';
import HostingSidebar from './HostingSidebar';
import HostingAccountsList from './HostingAccountsList';
import HostingIntegrationCard from './HostingIntegrationCard';
import { PageLayout } from '@/components/layout/PageLayout';

const HostingRender = () => {
    const { providerId, connectionId } = useParams();

    const getProviderName = (id: string | undefined): 'Render' | 'Vercel' | 'AWS' | 'Railway' | 'DigitalOcean' | 'Fly.io' | 'Coolify' => {
        switch (id?.toLowerCase()) {
            case 'vercel': return 'Vercel';
            case 'aws': return 'AWS';
            case 'railway': return 'Railway';
            case 'digitalocean': return 'DigitalOcean';
            case 'fly': return 'Fly.io';
            case 'coolify': return 'Coolify';
            case 'render': 
            default: return 'Render';
        }
    };

    const providerName = getProviderName(providerId);

    return (
        <PageLayout 
            title="Hosting Integration" 
            subtitle="Connect your cloud hosting providers to manage deployments."
            fullWidth={true}
        >
            <div className="flex flex-col lg:flex-row gap-8 w-full">
                <div className="flex-1 min-w-0">
                    <HostingIntegrationCard 
                        key={connectionId || providerName} 
                        provider={providerName} 
                        connectionId={connectionId} 
                    />
                </div>
                
                <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-8 h-fit flex flex-col gap-6">
                    <HostingAccountsList activeConnectionId={connectionId} />
                    <HostingSidebar />
                </aside>
            </div>
        </PageLayout>
    );
};

export default HostingRender;
