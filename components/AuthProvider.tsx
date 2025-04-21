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
  
  // This flag helps prevent multiple redirects
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        // Get current session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          
          // If user is on login page and already has a session, redirect to dashboard
          if (router.pathname === '/login' && !isRedirecting) {
            setIsRedirecting(true);
            console.log('Redirecting to dashboard from initial session check');
            setTimeout(() => {
              router.push('/dashboard').finally(() => {
                setIsRedirecting(false);
              });
            }, 100);
          }
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
        
        // Update session and user state
        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        // Handle redirects for sign in event
        if (event === 'SIGNED_IN' && router.pathname === '/login' && !isRedirecting) {
          setIsRedirecting(true);
          console.log('Redirecting to dashboard after sign in');
          
          // Use a slight delay to ensure state updates have settled
          setTimeout(() => {
            router.push('/dashboard').finally(() => {
              setIsRedirecting(false);
            });
          }, 100);
        }
        
        // Handle sign out event
        if (event === 'SIGNED_OUT') {
          // Clear local state
          setSession(null);
          setUser(null);
          
          // Redirect to login if not already there
          if (router.pathname !== '/login' && !isRedirecting) {
            setIsRedirecting(true);
            console.log('Redirecting to login after sign out');
            setTimeout(() => {
              router.push('/login').finally(() => {
                setIsRedirecting(false);
              });
            }, 100);
          }
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [router.pathname, isRedirecting, router]);

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

      console.log('Sign in successful, session:', data.session ? 'exists' : 'null');
      
      // Update local state immediately, but let the auth listener handle redirects
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
        
        // Update local state, but let auth listener handle redirects
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
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        return;
      }
      
      // Clear local state immediately, but let auth listener handle redirect
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Unexpected error during sign out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, signIn, signUp, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);