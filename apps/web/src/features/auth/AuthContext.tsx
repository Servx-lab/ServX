import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { AuthContextValue, AuthUser } from './types';
import { syncUser } from './api';
import { useLocalCache } from '@/hooks/useLocalCache';
import { getRepos, getGitHubStatus, saveGitHubInstallationToken } from '@/features/github/api';
import { getHostingStatus, getConnections } from '@/features/hosting/api';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race<T>([
            promise,
            new Promise<T>((_, reject) => {
                timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
            }),
        ]);
    } finally {
        if (timer) clearTimeout(timer);
    }
}

function extractGitHubOAuthFields(session: any) {
    const providerToken = session?.provider_token;
    const providerRefreshToken = session?.provider_refresh_token;

    return {
        githubAccessToken: providerToken,
        githubRefreshToken: providerRefreshToken,
    };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGitHubLinked, setIsGitHubLinked] = useState(false);
    const [githubTokenValid, setGithubTokenValid] = useState<boolean | null>(null);
    const navigate = useNavigate();
    const lastSyncedUid = React.useRef<string | null>(null);
    const isRefreshingRef = React.useRef(false);
    const { updateCache, clearCache } = useLocalCache();

    const checkGitHubTokenHealth = useCallback(async (): Promise<boolean> => {
        try {
            const status = await getGitHubStatus();
            if (status.connected && !status.expired) {
                setGithubTokenValid(true);
                return true;
            }
            setGithubTokenValid(false);
            console.log('[Auth] GitHub token missing or expired on backend.');
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

    const syncUserToBackend = useCallback(async (opts?: { 
        githubAccessToken?: string; 
        githubRefreshToken?: string;
        githubTokenExpiry?: number;
        githubId?: string 
    }) => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) return;
        try {
            if (opts?.githubAccessToken) {
                try {
                    await saveGitHubInstallationToken(opts.githubAccessToken);
                } catch (tokenSaveError) {
                    console.error('Failed to persist per-user GitHub installation token:', tokenSaveError);
                }
            }

            await withTimeout(syncUser({
                name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User',
                avatarUrl: currentUser.user_metadata?.avatar_url || '',
                githubAccessToken: opts?.githubAccessToken,
                githubRefreshToken: opts?.githubRefreshToken,
                githubTokenExpiry: opts?.githubTokenExpiry,
                githubId: opts?.githubId,
            }), 12000, 'syncUser');
            lastSyncedUid.current = currentUser.id;

            if (opts?.githubAccessToken) {
                setGithubTokenValid(true);
            }
        } catch (err) {
            console.error('Failed to sync user to backend (continuing auth):', err);
        }
    }, []);

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
                const hasHash = window.location.hash && (
                    window.location.hash.includes('access_token=') ||
                    window.location.hash.includes('error=')
                );

                const { data: { session } } = await supabase.auth.getSession();
                if (!mounted) return;

                if (session?.user) {
                    const mappedUser: AuthUser = {
                        id: session.user.id,
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

                if (!hasHash && mounted) {
                    setLoading(false);
                }
            } catch (err) {
                console.error('[Auth] Initial session check failed:', err);
                if (mounted) setLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            const currentUser = session?.user;
            if (currentUser) {
                const mappedUser: AuthUser = {
                    id: currentUser.id,
                    email: currentUser.email || '',
                    displayName: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0],
                    photoURL: currentUser.user_metadata?.avatar_url,
                };
                setUser(mappedUser);
                const identities = currentUser.identities || [];
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
        try {
            isRefreshingRef.current = true;
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`,
                    scopes: 'repo'
                }
            });
            if (error) throw error;
        } catch (error) {
            isRefreshingRef.current = false;
            console.error('GitHub Login Error:', error);
            throw error;
        }
    };

    const signInWithGoogle = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`,
                }
            });
            if (error) throw error;
        } catch (error) {
            console.error('Google Login Error:', error);
            throw error;
        }
    };

    const linkGitHub = async () => {
        try {
            isRefreshingRef.current = true;
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: `${window.location.origin}/onboarding`,
                    scopes: 'repo'
                }
            });
            if (error) throw error;
        } catch (error) {
            isRefreshingRef.current = false;
            console.error('Link GitHub Error:', error);
            throw error;
        }
    };

    const refreshGitHubConnection = async () => {
        try {
            isRefreshingRef.current = true;
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: `${window.location.origin}/github?success=reconnected`,
                    scopes: 'repo'
                }
            });
            if (error) throw error;
        } catch (error) {
            isRefreshingRef.current = false;
            console.error('[Auth] Failed to refresh GitHub connection:', error);
            throw error;
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        navigate('/');
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
