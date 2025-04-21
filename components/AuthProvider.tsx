// components/AuthProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any, user: User | null }>;
  signOut: () => Promise<void>;
  loading: boolean;
  ensureUserProfile: (userId?: string, userData?: any) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Function to ensure user profile exists - can be called whenever needed
  const ensureUserProfile = async (userId?: string, userData: any = {}) => {
    try {
      if (!userId) {
        // Use the current user if no userId is provided
        if (!user) return false;
        userId = user.id;
      }
      
      console.log("Ensuring profile exists for user:", userId);
      
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
        
      if (!checkError && existingProfile) {
        console.log("Profile already exists for user:", userId);
        return true;
      }
      
      // Get user info for profile creation
      const email = userData.email || (user?.email || '');
      const name = userData.name || 
        (user?.user_metadata?.name || 
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
        });
        
      if (createError) {
        console.error('Error creating profile:', createError);
        
        // Try using API fallback if direct creation fails
        try {
          const response = await fetch('/api/auth/ensure-profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ userId })
          });
          
          const result = await response.json();
          if (result.success) {
            console.log("Profile created successfully via API");
            return true;
          }
        } catch (apiError) {
          console.error("API fallback failed:", apiError);
        }
        
        return false;
      }
      
      console.log("Profile created successfully for user:", userId);
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
          
          // Ensure profile exists for the user
          await ensureUserProfile(data.session.user.id);
          
          // If user is on login page and already has a session, redirect to dashboard
          if (router.pathname === '/login' || router.pathname === '/register') {
            console.log("User already logged in, redirecting to dashboard");
            window.location.href = '/dashboard';
            return;
          }
        } else {
          console.log("No session found during initialization");
        }
        
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
          
          // Ensure profile exists when user signs in
          if (currentUser) {
            await ensureUserProfile(currentUser.id);
          }
          
          setSession(newSession);
          setUser(currentUser);
          
          // Direct redirect to dashboard using window.location for sign in
          if (router.pathname === '/login' || router.pathname === '/register') {
            console.log("Redirecting to dashboard after sign in");
            window.location.href = '/dashboard';
            return;
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("User signed out, updating state");
          setSession(null);
          setUser(null);
          
          // Direct redirect to login page for sign out
          console.log("Redirecting to login after sign out");
          window.location.href = '/login';
          return;
        } else {
          // Update state for other events
          setSession(newSession);
          setUser(newSession?.user || null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [router.pathname]);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting to sign in with:', email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }

      console.log('Sign in successful:', data.session ? 'Session exists' : 'No session');
      
      // Ensure profile exists after successful sign in
      if (data.user) {
        await ensureUserProfile(data.user.id, { email });
      }
      
      // Update state and let auth state change handler handle the redirect
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
      }
      
      return { error: null };
    } catch (err) {
      console.error('Unexpected error during sign in:', err);
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      console.log('Attempting to sign up with:', email);
      
      // First, attempt to create the user account
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        console.error('Sign up error:', error);
        return { error, user: null };
      }

      console.log('Sign up successful, user:', data.user ? 'exists' : 'null');
      
      // Ensure profile exists after successful sign up
      if (data.user) {
        await ensureUserProfile(data.user.id, { email, name });
      }
      
      // Update state and let the auth state change handler handle the redirect
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
      }

      return { error: null, user: data.user };
    } catch (err) {
      console.error('Unexpected error during sign up:', err);
      return { error: err, user: null };
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out');
      
      // Set a flag to indicate clean logout
      localStorage.setItem('clean_logout', 'true');
      
      // Clear any tokens or state
      await supabase.auth.signOut();
      
      // Clear state
      setSession(null);
      setUser(null);
      
      // Redirect
      window.location.href = '/login';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      session, 
      user, 
      signIn, 
      signUp, 
      signOut, 
      loading,
      ensureUserProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);