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
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
      (event, newSession) => {
        console.log('Auth state change event:', event);
        
        if (event === 'SIGNED_IN') {
          console.log("User signed in, updating state");
          setSession(newSession);
          setUser(newSession?.user || null);
          
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
      
      // Update state but don't redirect here - let the auth state change handler do it
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
      
      // Create profile
      if (data.user) {
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              name,
              email,
              created_at: new Date().toISOString(),
            });
            
          if (profileError) {
            console.error('Error creating profile:', profileError);
          } else {
            console.log('Profile created successfully');
          }
        } catch (profileErr) {
          console.error('Exception during profile creation:', profileErr);
        }
        
        // Update state but don't redirect here - let the auth state change handler do it
        if (data.session) {
          setSession(data.session);
          setUser(data.user);
        }
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
      await supabase.auth.signOut();
      
      // State will be updated by the auth state change listener
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);