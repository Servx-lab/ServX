import React from 'react';
import { useParams } from 'react-router-dom';
import Sidebar from "@/components/Sidebar";
import HostingSidebar from "@/components/Hosting/HostingSidebar";
import HostingIntegrationCard from "@/components/Hosting/HostingIntegrationCard";
import { useIsMobile } from "@/hooks/use-mobile";

const HostingRender = () => {
    const isMobile = useIsMobile();
    const { providerId } = useParams();

    const getProviderName = (id: string | undefined): 'Render' | 'Vercel' | 'AWS' | 'Railway' | 'DigitalOcean' | 'Fly.io' => {
        switch (id?.toLowerCase()) {
            case 'vercel': return 'Vercel';
            case 'aws': return 'AWS';
            case 'railway': return 'Railway';
            case 'digitalocean': return 'DigitalOcean';
            case 'fly': return 'Fly.io';
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
        <div className="flex h-screen w-full bg-background overflow-hidden relative">
            {!isMobile && <Sidebar />}
            
            <main className={`flex-1 flex h-full overflow-hidden transition-all duration-300 ${isMobile ? 'pl-0' : 'pl-56'} relative z-0`}>
                <HostingSidebar />
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    <div className="flex-1 overflow-auto p-4 md:p-6 mb-20 md:mb-0 scroll-smooth">
                        <div className="max-w-[1600px] mx-auto space-y-6 animate-fade-in pb-10">
                            <header className="flex justify-between items-center mb-0 sticky top-0 bg-background/80 backdrop-blur-md z-40 py-4">
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight text-white/90">
                                        Hosting Integration
                                    </h1>
                                    <p className="text-muted-foreground mt-1 text-sm">
                                        Connect your cloud hosting providers to manage deployments.
                                    </p>
                                </div>
                            </header>

                            <HostingIntegrationCard key={providerName} provider={providerName} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HostingRender;