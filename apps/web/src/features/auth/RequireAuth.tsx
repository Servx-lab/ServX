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

    const isProcessingCallback = window.location.hash && window.location.hash.includes('access_token=');
    const hasError = (window.location.hash && window.location.hash.includes('error=')) || window.location.search.includes('error=');

    if (hasError) {
        // Extract the error_description for better debugging
        let errorDesc = "OAuth failed. Please try again.";
        try {
            const params = new URLSearchParams(window.location.hash.substring(1) || window.location.search);
            if (params.get('error_description')) {
                errorDesc = params.get('error_description')!.replace(/\+/g, ' ');
            }
        } catch(e) {}
        
        // Clear the URL and redirect back to auth so they aren't stuck forever
        return <Navigate to="/auth" state={{ from: location, error: errorDesc }} replace />;
    }

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
