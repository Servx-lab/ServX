import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
    User, 
    signInWithPopup, 
    GithubAuthProvider, 
    GoogleAuthProvider, 
    onAuthStateChanged,
    linkWithPopup,
    getAdditionalUserInfo,
    signOut
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useNavigate } from 'react-router-dom';
import apiClient from '@/lib/apiClient';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isGitHubLinked: boolean;
    signInWithGitHub: (shouldNavigate?: boolean) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    linkGitHub: (shouldNavigate?: boolean) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGitHubLinked, setIsGitHubLinked] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const hasGitHub = currentUser.providerData.some(
                    (provider) => provider.providerId === 'github.com'
                );
                setIsGitHubLinked(hasGitHub);
                
                // Ensure user exists in backend on refresh
                try {
                    await apiClient.post('/auth/sync', {
                        name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                        avatarUrl: currentUser.photoURL || '',
                    });
                } catch (err) {
                    console.error('Failed to sync user to backend on auth state change:', err);
                }
            } else {
                setIsGitHubLinked(false);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const syncUserToBackend = async (opts?: { githubAccessToken?: string; githubId?: string }) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        try {
            await apiClient.post('/auth/sync', {
                name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                avatarUrl: currentUser.photoURL || '',
                githubAccessToken: opts?.githubAccessToken,
                githubId: opts?.githubId,
            });
        } catch (err) {
            console.error('Failed to sync user to backend:', err);
        }
    };

    const signInWithGitHub = async (shouldNavigate = true) => {
        try {
            const provider = new GithubAuthProvider();
            provider.addScope('repo'); // Essential for "Zero-Touch" repo access
            
            const result = await signInWithPopup(auth, provider);
            
            // Extract GitHub access token from the credential
            const credential = GithubAuthProvider.credentialFromResult(result);
            const githubToken = credential?.accessToken;
            const profile = getAdditionalUserInfo(result)?.profile as Record<string, any> | undefined;
            const githubId = profile?.id?.toString();
            
            // Sync user and GitHub token to MongoDB
            await syncUserToBackend({ githubAccessToken: githubToken, githubId });
            
            setIsGitHubLinked(true);
            
            const userInfo = getAdditionalUserInfo(result);
            
            if (shouldNavigate) {
                if (userInfo?.isNewUser) {
                    navigate('/onboarding');
                } else {
                    navigate('/dashboard');
                }
            }
        } catch (error) {
            console.error("GitHub Login Error:", error);
            throw error;
        }
    };

    const signInWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            
            // Sync user record to MongoDB (no GitHub token yet)
            await syncUserToBackend();
            
            // Check if GitHub is already linked to this account
            if (auth.currentUser) {
                 const hasGitHub = auth.currentUser.providerData.some(
                    (p) => p.providerId === 'github.com'
                );
                
                if (hasGitHub) {
                    setIsGitHubLinked(true);
                    // For existing sessions, we assume they've seen onboarding
                    navigate('/dashboard');
                } else {
                    // Fallback Logic: Redirect to Bridge
                    navigate('/bridge');
                }
            }
        } catch (error) {
            console.error("Google Login Error:", error);
            throw error;
        }
    };

    const linkGitHub = async (shouldNavigate = true) => {
        if (!auth.currentUser) return;
        try {
             const provider = new GithubAuthProvider();
             provider.addScope('repo');
             const result = await linkWithPopup(auth.currentUser, provider);
             
             // Extract GitHub token and sync to backend
             const credential = GithubAuthProvider.credentialFromResult(result);
             const githubToken = credential?.accessToken;
             const profile = getAdditionalUserInfo(result)?.profile as Record<string, any> | undefined;
             const githubId = profile?.id?.toString();
             await syncUserToBackend({ githubAccessToken: githubToken, githubId });
             
             setIsGitHubLinked(true);
             // After linking, we treat this as the "completion" of setup for Google users
             if (shouldNavigate) {
                 navigate('/onboarding');
             }
        } catch (error) {
            console.error("Link GitHub Error:", error);
            throw error;
        }
    };

    const logout = async () => {
        await signOut(auth);
        navigate('/');
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            isGitHubLinked, 
            signInWithGitHub, 
            signInWithGoogle,
            linkGitHub,
            logout 
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
