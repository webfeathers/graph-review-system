// components/AuthProvider.tsx with Google-only auth
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Role } from '../types/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userRole: Role | null;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  ensureUserProfile: (userId?: string, userData?: any) => Promise<boolean>;
  isAdmin: () => boolean;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Function to fetch user role
  const fetchUserRole = async (userId: string): Promise<Role> => {
    console.log("Fetching role for user:", userId);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching user role:', error);
        return 'Member'; // Default to Member on error
      }
      
      const role = data?.role as Role || 'Member';
      console.log("Retrieved role:", role);
      return role;
    } catch (err) {
      console.error('Error in fetchUserRole:', err);
      return 'Member'; // Default to Member on error
    }
  };

  // Function to check if current user is admin
  const isAdmin = (): boolean => {
    return userRole === 'Admin';
  };

  // Function to ensure user profile exists - can be called whenever needed
  const ensureUserProfile = async (userId?: string, userData: any = {}): Promise<boolean> => {
    try {
      console.log("ensureUserProfile called");
      if (!userId) {
        // Use the current user if no userId is provided
        if (!user) {
          console.log("No user available for profile check");
          return false;
        }
        userId = user.id;
      }
      
      console.log("Ensuring profile exists for user:", userId);
      
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .single();
      
      if (checkError) {
        console.error('Profile check error:', checkError);
      }
      
      if (!checkError && existingProfile) {
        console.log("Profile already exists for user:", userId, "with role:", existingProfile.role);
        // Update user role if the profile exists
        setUserRole(existingProfile.role as Role || 'Member');
        return true;
      }
      
      // Get user info for profile creation from userData or current user
      const email = userData.email || (user?.email || '');
      const name = userData.name || 
        (user?.user_metadata?.name || 
         user?.user_metadata?.full_name ||
         (email ? email.split('@')[0] : 'User'));
      
      console.log("Creating missing profile for user:", userId);
      
      // Create profile
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          name,
          email,
          created_at: new Date().toISOString(),
          role: 'Member' // Default to Member role for new users
        });
      
      if (createError) {
        console.error('Error creating profile:', createError);
        
        // Try using API fallback if direct creation fails
        try {
          console.log("Attempting API fallback for profile creation");
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token || '';
          
          if (!token) {
            console.error("No auth token available for API fallback");
            return false;
          }
          
          const response = await fetch('/api/auth/ensure-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId })
          });
          
          if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
          }
          
          const result = await response.json();
          if (result.success) {
            console.log("Profile created successfully via API");
            
            // Set default role
            setUserRole('Member');
            return true;
          } else {
            throw new Error(result.message || "API failed to create profile");
          }
        } catch (apiError) {
          console.error("API fallback failed:", apiError);
          return false;
        }
      }
      
      console.log("Profile created successfully for user:", userId);
      // Set default role for new users
      setUserRole('Member');
      return true;
    } catch (err) {
      console.error('Error in ensureUserProfile:', err);
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
        
        console.log("Session check complete");
        
        if (data.session) {
          console.log("Session found during initialization");
          setSession(data.session);
          setUser(data.session.user);
          
          // Fetch user role - await this to ensure it completes
          console.log("Fetching user role...");
          try {
            const role = await fetchUserRole(data.session.user.id);
            console.log("Role fetched successfully:", role);
            setUserRole(role);
          } catch (roleError) {
            console.error("Error fetching user role:", roleError);
            // Default to Member role on error
            setUserRole('Member');
          }
          
          // Ensure profile exists
          console.log("Checking profile exists...");
          await ensureUserProfile(data.session.user.id);
          console.log("Profile check completed");
          
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
          
          // Fetch user role
          if (currentUser) {
            try {
              // Wait for role fetch to complete before continuing
              const role = await fetchUserRole(currentUser.id);
              setUserRole(role);
              
              // Ensure profile exists
              await ensureUserProfile(currentUser.id);
              
              // Redirect to dashboard
              if (router.pathname === '/login' || router.pathname === '/register') {
                console.log("Redirecting to dashboard after sign in");
                router.replace('/dashboard');
              }
            } catch (roleError) {
              console.error("Error fetching user role:", roleError);
              setUserRole('Member');
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
        } else if (newSession) {
          // Update state for other events (token refresh, etc.)
          setSession(newSession);
          setUser(newSession.user || null);
          
          // Fetch user role if user exists
          if (newSession.user) {
            try {
              const role = await fetchUserRole(newSession.user.id);
              setUserRole(role);
            } catch (roleError) {
              console.error("Error fetching user role:", roleError);
              setUserRole('Member');
            }
          } else {
            setUserRole(null);
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
      isAdmin
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);