import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { AuthContextValue, AuthUser } from './types';
import { syncUser } from './api';
import { useLocalCache } from '@/hooks/useLocalCache';
import { getRepos, getGitHubStatus } from '@/features/github/api';
import { getHostingStatus, getConnections } from '@/features/hosting/api';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGitHubLinked, setIsGitHubLinked] = useState(false);
    const [githubTokenValid, setGithubTokenValid] = useState<boolean | null>(null);
    const navigate = useNavigate();
    const lastSyncedUid = React.useRef<string | null>(null);
    const { updateCache, clearCache } = useLocalCache();

    const checkGitHubTokenHealth = useCallback(async (): Promise<boolean> => {
        try {
            const status = await getGitHubStatus();
            if (status.connected && !status.expired) {
                setGithubTokenValid(true);
                return true;
            }
            setGithubTokenValid(false);
            return false;
        } catch {
            setGithubTokenValid(false);
            return false;
        }
    }, []);

    const prefetchUserData = useCallback(async (skipGitHub: boolean) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log(`[Auth] Prefetching user data...${skipGitHub ? ' (skipping GitHub)' : ''}`);
        try {
            const result = await Promise.allSettled([
                getConnections(),
                skipGitHub ? Promise.reject('skipped') : getRepos(),
                getHostingStatus('vercel'),
                getHostingStatus('render'),
            ]);

            const [connections, githubRepos, vercelStatus, renderStatus] = result;

            const cacheUpdate: Record<string, any> = {
                connections: connections.status === 'fulfilled' ? connections.value : [],
                vercelStatus: vercelStatus.status === 'fulfilled' ? vercelStatus.value : null,
                renderStatus: renderStatus.status === 'fulfilled' ? renderStatus.value : null,
            };

            if (!skipGitHub) {
                cacheUpdate.githubRepos = githubRepos.status === 'fulfilled' ? githubRepos.value : [];
            }

            updateCache(cacheUpdate);
            console.log('[Auth] Local cache populated.');
        } catch (err) {
            console.error('[Auth] Failed to prefetch user data:', err);
        }
    }, [updateCache]);

    // Main Auth State Listener (Supabase)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setLoading(true);
            if (session?.user) {
                const mappedUser: AuthUser = {
                    uid: session.user.id,
                    email: session.user.email || '',
                    displayName: session.user.user_metadata.full_name || session.user.user_metadata.name || session.user.email?.split('@')[0],
                    photoURL: session.user.user_metadata.avatar_url,
                };
                setUser(mappedUser);

                // Check if GitHub is linked (identities)
                const identities = session.user.identities || [];
                const hasGitHub = identities.some(id => id.provider === 'github');
                setIsGitHubLinked(hasGitHub);

                // Sync with backend if new session
                if (lastSyncedUid.current !== session.user.id) {
                    try {
                        await syncUser({
                            name: mappedUser.displayName || 'User',
                            avatarUrl: mappedUser.photoURL || '',
                        });
                        lastSyncedUid.current = session.user.id;
                        
                        let tokenIsGood = false;
                        if (hasGitHub) {
                            tokenIsGood = await checkGitHubTokenHealth();
                        }
                        prefetchUserData(!tokenIsGood);
                    } catch (err) {
                        console.error('[Auth] Sync failed:', err);
                    }
                }
            } else {
                setUser(null);
                setIsGitHubLinked(false);
                setGithubTokenValid(null);
                lastSyncedUid.current = null;
                clearCache();
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [clearCache, checkGitHubTokenHealth, prefetchUserData]);

    const signInWithGitHub = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                scopes: 'repo read:user',
                redirectTo: `${window.location.origin}/auth/v1/callback`
            }
        });
        if (error) throw error;
    };

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/v1/callback`
            }
        });
        if (error) throw error;
    };

    const logout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const linkGitHub = async () => {
        // In Supabase, linking is essentially re-authenticating with the provider
        // or using the same signInWithOAuth flow if already logged in.
        await signInWithGitHub();
    };

    const refreshGitHubConnection = async () => {
        await signInWithGitHub();
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            isGitHubLinked,
            githubTokenValid,
            signInWithGitHub, 
            signInWithGoogle,
            linkGitHub,
            refreshGitHubConnection,
            logout 
        }}>
            {children}
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
