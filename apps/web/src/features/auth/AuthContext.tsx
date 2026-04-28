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
        console.log(`[Auth] Prefetching user data...`);
        try {
            // 1. Fetch connections first to know what to prefetch
            const connections = await getConnections().catch(() => []);
            
            const hasVercel = connections.some(c => c.provider === 'Vercel');
            const hasRender = connections.some(c => c.provider === 'Render');

            // 2. Fetch statuses only for connected providers
            const result = await Promise.allSettled([
                skipGitHub ? Promise.reject('skipped') : getRepos(),
                hasVercel ? getHostingStatus('vercel') : Promise.reject('not_connected'),
                hasRender ? getHostingStatus('render') : Promise.reject('not_connected'),
            ]);

            const [githubRepos, vercelStatus, renderStatus] = result;

            const cacheUpdate: Record<string, any> = {
                connections,
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
        let mounted = true;

        const handlePostLoginTasks = async (session: any, mappedUser: AuthUser) => {
            if (lastSyncedUid.current === session.user.id && !session.provider_token) return;
            
            try {
                const syncPayload: any = {
                    name: mappedUser.displayName || 'User',
                    avatarUrl: mappedUser.photoURL || '',
                };

                // If we have a provider token (from a fresh OAuth login/link), send it to the backend
                if (session.provider_token) {
                    syncPayload.githubAccessToken = session.provider_token;
                    syncPayload.githubRefreshToken = session.provider_refresh_token;
                    syncPayload.githubId = session.user.user_metadata.provider_id;
                }

                await syncUser(syncPayload);
                lastSyncedUid.current = session.user.id;
                
                const identities = session.user.identities || [];
                const hasGitHub = identities.some((id: any) => id.provider === 'github');
                
                let tokenIsGood = false;
                if (hasGitHub) {
                    tokenIsGood = await checkGitHubTokenHealth();
                }
                prefetchUserData(!tokenIsGood);
            } catch (err) {
                console.error('[Auth] Background sync/prefetch failed:', err);
            }
        };

        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!mounted) return;

                if (session?.user) {
                    const mappedUser: AuthUser = {
                        uid: session.user.id,
                        email: session.user.email || '',
                        displayName: session.user.user_metadata.full_name || session.user.user_metadata.name || session.user.email?.split('@')[0],
                        photoURL: session.user.user_metadata.avatar_url,
                    };
                    setUser(mappedUser);
                    
                    const identities = session.user.identities || [];
                    setIsGitHubLinked(identities.some(id => id.provider === 'github'));
                    
                    // Background sync (don't block loading)
                    handlePostLoginTasks(session, mappedUser);
                }
            } catch (err) {
                console.error('[Auth] Initial session check failed:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            if (session?.user) {
                const mappedUser: AuthUser = {
                    uid: session.user.id,
                    email: session.user.email || '',
                    displayName: session.user.user_metadata.full_name || session.user.user_metadata.name || session.user.email?.split('@')[0],
                    photoURL: session.user.user_metadata.avatar_url,
                };
                setUser(mappedUser);
                const identities = session.user.identities || [];
                setIsGitHubLinked(identities.some(id => id.provider === 'github'));

                // Handle background tasks without blocking
                handlePostLoginTasks(session, mappedUser);
            } else {
                setUser(null);
                setIsGitHubLinked(false);
                setGithubTokenValid(null);
                lastSyncedUid.current = null;
                clearCache();
            }
            
            setLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
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
