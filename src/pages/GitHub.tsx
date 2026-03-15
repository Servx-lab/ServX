import GitHubIntegration from "@/components/GitHubIntegration/GitHubIntegration";

const GitHub = () => {
    return (
        <main className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
            <div className="flex-1 overflow-auto p-4 md:p-6 mb-20 md:mb-0 scroll-smooth">
                    <div className="max-w-[1600px] mx-auto animate-fade-in pb-10 h-full flex flex-col">
                        <div className="glass-card rounded-xl border border-gray-200 p-0 relative overflow-hidden flex-1 min-h-[600px] shadow-sm">
                             <GitHubIntegration />
                        </div>
                    </div>
                </div>
        </main>
    );
};

export default GitHub;