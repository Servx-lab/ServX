import GitHubIntegration from "@/components/GitHubIntegration/GitHubIntegration";

const GitHub = () => {
    return (
        <main className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
            <div className="flex-1 overflow-hidden">
                <div className="max-w-[1600px] mx-auto animate-fade-in h-full flex flex-col p-4 md:p-6">
                    <div className="glass-card rounded-xl border border-gray-200 p-0 relative overflow-hidden flex-1 shadow-sm">
                        <GitHubIntegration />
                    </div>
                </div>
            </div>
        </main>
    );
};

export default GitHub;