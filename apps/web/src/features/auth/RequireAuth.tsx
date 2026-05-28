import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import DevicePendingTakeover from './DevicePendingTakeover';

interface RequireAuthProps {
    children: JSX.Element;
    requireGitHub?: boolean; // If true, checks for GitHub linkage
}

export const RequireAuth = ({ children, requireGitHub = true }: RequireAuthProps) => {
    const { user, loading, isGitHubLinked, isDevicePendingApproval } = useAuth();
    const location = useLocation();

    // Check if Supabase is currently processing an OAuth hash token in the URL.
    // If so, we must keep rendering the loading state and block immediate routing redirects.
    const isProcessingCallback = window.location.hash && (
        window.location.hash.includes('access_token=') || 
        window.location.hash.includes('error=')
    );

    if (loading || isProcessingCallback) {
        return <div className="h-screen w-full flex items-center justify-center bg-orizons-void"><LoadingSpinner /></div>;
    }

    if (isDevicePendingApproval) {
        return <DevicePendingTakeover />;
    }

    if (!user) {
        // Not logged in -> Redirect to Auth page
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    if (requireGitHub && !isGitHubLinked) {
        // Logged in but GitHub not linked -> Redirect to Bridge
        // Avoid redirect loop if we are already on Bridge
        if (location.pathname !== '/bridge') {
             return <Navigate to="/bridge" replace />;
        }
    }

    // If we are on Bridge but have GitHub linked, send to Dashboard
    if (location.pathname === '/bridge' && isGitHubLinked) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};
