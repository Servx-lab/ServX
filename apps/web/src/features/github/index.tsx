import GitHubIntegration from "./GitHubIntegration";
import { PageLayout } from "@/components/layout/PageLayout";

const GitHub = () => {
    return (
        <PageLayout 
            title="GitHub Integration" 
            subtitle="Connect your repositories for automated scanning and insights."
            fullWidth={true}
            noPadding={true}
        >
            <GitHubIntegration />
        </PageLayout>
    );
};

export default GitHub;
