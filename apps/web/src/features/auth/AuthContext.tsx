import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
import { AuthContextValue, AuthUser } from './types';
import { syncUser } from './api';
import { useLocalCache } from '@/hooks/useLocalCache';
import { getRepos, getGitHubStatus } from '@/features/github/api';
import { getHostingStatus, getConnections } from '@/features/hosting/api';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function extractGitHubOAuthFields(result: any) {
    const credential = GithubAuthProvider.credentialFromResult(result);
    const githubToken = credential?.accessToken;
    const tokenResponse = (result as any)._tokenResponse;
    const githubRefreshToken = tokenResponse?.refreshToken;
    const expiresIn = tokenResponse?.expiresIn ? Number(tokenResponse.expiresIn) : undefined;
    const profile = getAdditionalUserInfo(result)?.profile as Record<string, any> | undefined;
    const githubId = profile?.id?.toString();

    return {
        githubAccessToken: githubToken,
        githubRefreshToken,
        githubTokenExpiry: expiresIn ? Date.now() + (expiresIn * 1000) : undefined,
        githubId,
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

    const prefetchUserData = useCallback(async (skipGitHub: boolean) => {
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log(`[Auth] Prefetching user data for local cache...${skipGitHub ? ' (skipping GitHub — token invalid)' : ''}`);
        try {
            const fetches: [
                Promise<any>, Promise<any>, Promise<any>, Promise<any>
            ] = [
                getConnections(),
                skipGitHub ? Promise.reject('skipped') : getRepos(),
                getHostingStatus('vercel'),
                getHostingStatus('render'),
            ];

            const [connections, githubRepos, vercelStatus, renderStatus] = await Promise.allSettled(fetches);

            const cacheUpdate: Record<string, any> = {
                connections: connections.status === 'fulfilled' ? connections.value : [],
                vercelStatus: vercelStatus.status === 'fulfilled' ? vercelStatus.value : null,
                renderStatus: renderStatus.status === 'fulfilled' ? renderStatus.value : null,
            };

            if (!skipGitHub) {
                cacheUpdate.githubRepos = githubRepos.status === 'fulfilled' ? githubRepos.value : [];
            }

            updateCache(cacheUpdate);
            console.log('[Auth] Local cache populated successfully.');
        } catch (err) {
            console.error('[Auth] Failed to prefetch user data:', err);
        }
    }, [updateCache]);

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

    const syncUserToBackend = useCallback(async (opts?: { 
        githubAccessToken?: string; 
        githubRefreshToken?: string;
        githubTokenExpiry?: number;
        githubId?: string 
    }) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        try {
            await syncUser({
                name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                avatarUrl: currentUser.photoURL || '',
                githubAccessToken: opts?.githubAccessToken,
                githubRefreshToken: opts?.githubRefreshToken,
                githubTokenExpiry: opts?.githubTokenExpiry,
                githubId: opts?.githubId,
            });
            lastSyncedUid.current = currentUser.uid;

            if (opts?.githubAccessToken) {
                setGithubTokenValid(true);
            }
        } catch (err) {
            console.error('Failed to sync user to backend:', err);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const mappedUser: AuthUser = {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL,
                };
                setUser(mappedUser);
                
                const hasGitHub = currentUser.providerData.some(
                    (provider) => provider.providerId === 'github.com'
                );
                setIsGitHubLinked(hasGitHub);

                if (isRefreshingRef.current) {
                    setLoading(false);
                    return;
                }
                
                if (lastSyncedUid.current !== currentUser.uid) {
                    try {
                        await syncUser({
                            name: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
                            avatarUrl: currentUser.photoURL || '',
                        });
                        lastSyncedUid.current = currentUser.uid;

                        let tokenIsGood = false;
                        if (hasGitHub) {
                            tokenIsGood = await checkGitHubTokenHealth();
                        }

                        prefetchUserData(!tokenIsGood);
                    } catch (err) {
                        console.error('Failed to sync user to backend on auth state change:', err);
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
        return unsubscribe;
    }, [checkGitHubTokenHealth, prefetchUserData, clearCache]);

    const signInWithGitHub = async (shouldNavigate = true) => {
        try {
            const provider = new GithubAuthProvider();
            provider.addScope('repo');
            
            isRefreshingRef.current = true;
            const result = await signInWithPopup(auth, provider);
            const oauthFields = extractGitHubOAuthFields(result);
            
            await syncUserToBackend(oauthFields);
            
            setIsGitHubLinked(true);
            setGithubTokenValid(true);
            isRefreshingRef.current = false;

            prefetchUserData(false);
            
            const userInfo = getAdditionalUserInfo(result);
            
            if (shouldNavigate) {
                if (userInfo?.isNewUser) {
                    navigate('/onboarding');
                } else {
                    navigate('/dashboard');
                }
            }
        } catch (error) {
            isRefreshingRef.current = false;
            console.error("GitHub Login Error:", error);
            throw error;
        }
    };

    const signInWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            
            await syncUserToBackend();
            
            if (auth.currentUser) {
                 const hasGitHub = auth.currentUser.providerData.some(
                    (p) => p.providerId === 'github.com'
                );
                
                if (hasGitHub) {
                    setIsGitHubLinked(true);
                    navigate('/dashboard');
                } else {
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

             isRefreshingRef.current = true;
             const result = await linkWithPopup(auth.currentUser, provider);
             const oauthFields = extractGitHubOAuthFields(result);

             await syncUserToBackend(oauthFields);
             
             setIsGitHubLinked(true);
             setGithubTokenValid(true);
             isRefreshingRef.current = false;

             prefetchUserData(false);

             if (shouldNavigate) {
                 navigate('/onboarding');
             }
        } catch (error) {
            isRefreshingRef.current = false;
            console.error("Link GitHub Error:", error);
            throw error;
        }
    };

    const refreshGitHubConnection = async () => {
        if (!auth.currentUser) return;

        try {
            const provider = new GithubAuthProvider();
            provider.addScope('repo');

            isRefreshingRef.current = true;
            const result = await signInWithPopup(auth, provider);
            const oauthFields = extractGitHubOAuthFields(result);

            await syncUserToBackend(oauthFields);

            setGithubTokenValid(true);
            setIsGitHubLinked(true);
            isRefreshingRef.current = false;
        } catch (error) {
            isRefreshingRef.current = false;
            console.error('[Auth] Failed to refresh GitHub connection:', error);
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
