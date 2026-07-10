import React from 'react';
import { useParams } from 'react-router-dom';
import HostingSidebar from './HostingSidebar';
import HostingIntegrationCard from './HostingIntegrationCard';
import { PageLayout } from '@/components/layout/PageLayout';

const HostingRender = () => {
    const { providerId } = useParams();

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

    const handleConnect = async (apiKey: string) => {
        console.log(`Connecting to ${providerName} with API key: ${apiKey}`);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        alert(`Connected successfully to ${providerName}!`);
    };

    return (
        <PageLayout 
            title="Hosting Integration" 
            subtitle="Connect your cloud hosting providers to manage deployments."
            fullWidth={true}
        >
            <div className="flex flex-col lg:flex-row gap-8 w-full">
                <div className="flex-1 w-full">
                    <HostingIntegrationCard key={providerName} provider={providerName} />
                </div>
                
                <aside className="w-full lg:w-80 shrink-0 lg:sticky lg:top-8 h-fit">
                    <HostingSidebar />
                </aside>
            </div>
        </PageLayout>
    );
};

export default HostingRender;
