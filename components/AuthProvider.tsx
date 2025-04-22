// components/AuthProvider.tsx with ProfileService integration
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Role } from '../types/supabase';
import { ProfileService } from '../lib/profileService';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userRole: Role | null;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  ensureUserProfile: (userId?: string, userData?: any) => Promise<boolean>;
  isAdmin: () => boolean;
  refreshUserRole: () => Promise<Role | null>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Function to check if current user is admin
  const isAdmin = (): boolean => {
    return userRole === 'Admin';
  };

  // Function to refresh the user's role from the database
  const refreshUserRole = async (): Promise<Role | null> => {
    if (!user) return null;
    
    try {
      const role = await ProfileService.getUserRole(user.id);
      setUserRole(role);
      return role;
    } catch (error) {
      console.error('Error refreshing user role:', error);
      return null;
    }
  };

  // Function to ensure user profile exists - now using ProfileService
  const ensureUserProfile = async (userId?: string, userData: any = {}): Promise<boolean> => {
    try {
      // If no userId specified, use current user
      const targetUser = !userId ? user : 
        await supabase.auth.getUser()
          .then(({ data }) => data.user)
          .catch(() => null);
      
      if (!targetUser) {
        console.log("No user available for profile check");
        return false;
      }
      
      // Use the ProfileService to ensure profile exists
      const profile = await ProfileService.ensureProfile(targetUser);
      
      if (profile) {
        // Update role in state if this is for the current user
        if (targetUser.id === user?.id) {
          setUserRole(profile.role);
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error in ensureUserProfile:', error);
      return false;
    }
  };

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log("Initializing auth...");
        setLoading(true);
        
        // Get current session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        if (data.session) {
          console.log("Session found during initialization");
          setSession(data.session);
          setUser(data.session.user);
          
          // Ensure profile and get role in one step
          const profile = await ProfileService.ensureProfile(data.session.user);
          
          if (profile) {
            console.log("Profile found with role:", profile.role);
            setUserRole(profile.role);
          } else {
            console.warn("Could not find or create profile, defaulting to Member role");
            setUserRole('Member');
          }
          
          // If user is on login page and already has a session, redirect to dashboard
          if (router.pathname === '/login' || router.pathname === '/register') {
            console.log("User already logged in, redirecting to dashboard");
            router.replace('/dashboard');
          }
        } else {
          console.log("No session found during initialization");
          // Reset all state if no session found
          setSession(null);
          setUser(null);
          setUserRole(null);
        }
        
        console.log("Auth initialization complete");
        setLoading(false);
      } catch (err) {
        console.error('Error during auth initialization:', err);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state change event:', event);
        
        if (event === 'SIGNED_IN') {
          console.log("User signed in, updating state");
          const currentUser = newSession?.user || null;
          
          setSession(newSession);
          setUser(currentUser);
          
          // Ensure profile and get role in one step
          if (currentUser) {
            const profile = await ProfileService.ensureProfile(currentUser);
            
            if (profile) {
              setUserRole(profile.role);
            } else {
              console.warn("Could not find or create profile after sign in, defaulting to Member role");
              setUserRole('Member');
            }
            
            // Redirect to dashboard
            if (router.pathname === '/login' || router.pathname === '/register') {
              console.log("Redirecting to dashboard after sign in");
              router.replace('/dashboard');
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("User signed out, updating state");
          setSession(null);
          setUser(null);
          setUserRole(null);
          
          // Redirect to login page for sign out
          console.log("Redirecting to login after sign out");
          router.replace('/login');
        } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          // Update state for token refresh events
          console.log(`${event} event received, updating session data`);
          
          if (newSession) {
            setSession(newSession);
            setUser(newSession.user || null);
            
            // Only refresh role if needed
            if (newSession.user && !userRole) {
              const role = await ProfileService.getUserRole(newSession.user.id);
              setUserRole(role);
            }
          }
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [router.pathname]);

  const signInWithGoogle = async () => {
    try {
      console.log('Attempting to sign in with Google');
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/dashboard'
        }
      });

      if (error) {
        console.error('Google sign in error:', error);
        setLoading(false);
        return { error };
      }

      // No immediate state update here as this will redirect the user
      console.log('Google sign in initiated:', data);
      
      // Don't set loading to false here as we're redirecting
      return { error: null };
    } catch (err) {
      console.error('Unexpected error during Google sign in:', err);
      setLoading(false);
      return { error: err };
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out');
      setLoading(true);
      
      // Set a flag to indicate clean logout
      localStorage.setItem('clean_logout', 'true');
      
      // Clear any tokens or state
      await supabase.auth.signOut();
      
      // Clear state
      setSession(null);
      setUser(null);
      setUserRole(null);
      
      // Redirect
      router.replace('/login');
      setLoading(false);
    } catch (error) {
      console.error('Error signing out:', error);
      setLoading(false);
    }
  };

  console.log("Auth context current state:", { 
    sessionExists: !!session, 
    userExists: !!user, 
    userRole, 
    loading 
  });

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      userRole,
      signInWithGoogle,
      signOut, 
      loading,
      ensureUserProfile,
      isAdmin,
      refreshUserRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);