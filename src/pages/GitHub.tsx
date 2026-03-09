import Sidebar from "@/components/Sidebar";
import GitHubDashboard from "@/components/GitHubDashboard/GitHubDashboard";
import { useIsMobile } from "@/hooks/use-mobile";

const GitHub = () => {
    const isMobile = useIsMobile();

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden relative">
            {!isMobile && <Sidebar />}
            
            <main className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${isMobile ? 'pl-0' : 'pl-56'} relative z-0`}>
                <div className="flex-1 overflow-auto p-4 md:p-6 mb-20 md:mb-0 scroll-smooth">
                    <div className="max-w-[1600px] mx-auto space-y-6 animate-fade-in pb-10">
                        <header className="flex justify-between items-center mb-8 sticky top-0 bg-background/80 backdrop-blur-md z-40 py-2">
                             <div>
                                <h1 className="text-3xl font-bold tracking-tight text-white/90">
                                    GitHub Analytics
                                </h1>
                                <p className="text-muted-foreground mt-1">
                                    Manage and analyze your repositories and contributions.
                                </p>
                            </div>
                        </header>

                        <div className="glass-card rounded-xl border border-white/10 p-6 relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10 animate-pulse-slow" />
                             <GitHubDashboard />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default GitHub;