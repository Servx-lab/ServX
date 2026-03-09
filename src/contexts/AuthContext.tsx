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

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isGitHubLinked: boolean;
    signInWithGitHub: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    linkGitHub: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGitHubLinked, setIsGitHubLinked] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const hasGitHub = currentUser.providerData.some(
                    (provider) => provider.providerId === 'github.com'
                );
                setIsGitHubLinked(hasGitHub);
            } else {
                setIsGitHubLinked(false);
            }
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const signInWithGitHub = async () => {
        try {
            const provider = new GithubAuthProvider();
            provider.addScope('repo'); // Essential for "Zero-Touch" repo access
            
            const result = await signInWithPopup(auth, provider);
            // const additionalUserInfo = getAdditionalUserInfo(result);
            // We could extract the token here if we needed to store it manually,
            // but Firebase handles the session. The requirement allows extracting it 
            // if we were sending it to a backend, but for client-side purely, 
            // getting the credential via SDK is often enough or just relying on the session.
            
            // Logic: Immediate redirect if successful
            setIsGitHubLinked(true);
            
            const userInfo = getAdditionalUserInfo(result);
            
            if (userInfo?.isNewUser) {
                navigate('/onboarding');
            } else {
                navigate('/dashboard');
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

    const linkGitHub = async () => {
        if (!auth.currentUser) return;
        try {
             const provider = new GithubAuthProvider();
             provider.addScope('repo');
             await linkWithPopup(auth.currentUser, provider);
             setIsGitHubLinked(true);
             // After linking, we treat this as the "completion" of setup for Google users
             navigate('/onboarding');
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
