import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!loading) {
            if (user) {
                console.log('[AuthCallback] User authenticated, redirecting to dashboard');
                navigate('/dashboard');
            } else {
                console.warn('[AuthCallback] No user session found after callback, redirecting to login');
                navigate('/auth');
            }
        }
    }, [user, loading, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Completing Sign-in...</h2>
                <p className="text-sm text-gray-500">You will be redirected automatically.</p>
            </div>
        </div>
    );
};

export default AuthCallback;
