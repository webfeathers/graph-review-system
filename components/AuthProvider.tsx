// components/AuthProvider.tsx with additional debugging
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Role } from '../types/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userRole: Role | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any, user: User | null }>;
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
  const fetchUserRole = async (userId: string) => {
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
      
      console.log("Retrieved role:", data?.role || 'Member');
      return data?.role as Role || 'Member';
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
  const ensureUserProfile = async (userId?: string, userData: any = {}) => {
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
      .select('id, role, name, email')
      .eq('id', userId)
      .single();

      if (checkError) {
        console.error('Profile check error:', checkError);
      }

      if (!checkError && existingProfile) {
        console.log("Profile already exists for user:", userId, "with role:", existingProfile.role);

      // Update user role if the profile exists
        setUserRole(existingProfile.role as Role || 'Member');

      // If the profile exists but is missing name or email, update it
        if (!existingProfile.name || !existingProfile.email) {
          console.log("Profile exists but missing name or email, updating...");

        // Get user info for profile update
          const email = userData.email || user?.email || '';
          const name = userData.name || 
          user?.user_metadata?.name || 
          user?.user_metadata?.full_name ||
          (email ? email.split('@')[0] : 'User');
          
          const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            name: name || 'User',
            email: email || ''
          })
          .eq('id', userId);
          
          if (updateError) {
            console.error('Error updating profile:', updateError);
          } else {
            console.log("Profile updated with name and email");
          }
        }

        return true;
      }

    // Get user info for profile creation
      const email = userData.email || (user?.email || '');
      const name = userData.name || 
      (user?.user_metadata?.name || 
        user?.user_metadata?.full_name ||
        (email ? email.split('@')[0] : 'User'));

      console.log("Creating missing profile for user:", userId, "with name:", name, "and email:", email);

    // Create profile
      const { error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        name: name || 'User', // Ensure name is never empty
        email: email || '',
        created_at: new Date().toISOString(),
        role: 'Member' // Default to Member role for new users
      });

      if (createError) {
        console.error('Error creating profile:', createError);

      // Try using API fallback if direct creation fails
        try {
          console.log("Attempting API fallback for profile creation");
          const token = await supabase.auth.getSession()
          .then(result => result.data.session?.access_token || '');

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
            body: JSON.stringify({ 
              userId,
              name: name || 'User',
              email: email || ''
            })
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

// Get initial session
  const initializeAuth = async () => {
    try {
      console.log("Initializing auth... (1)");

    // Get current session - this is likely where it's hanging
      console.log("About to call getSession...");
      const sessionResult = await supabase.auth.getSession();
      console.log("getSession completed", sessionResult.data?.session ? "with session" : "without session");

      const { data, error } = sessionResult;

      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        return;
      }

      console.log("Session check complete (2)");

      if (data.session) {
        console.log("Session found (3)");
      // Set basic states first
        setSession(data.session);
        setUser(data.session.user);

      // Try to get the user role, but with a safety timeout
        try {
          console.log("Fetching role with timeout...");
          const rolePromise = fetchUserRole(data.session.user.id);

        // Create a timeout promise
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Role fetch timed out")), 3000);
          });

        // Race the promises
          const role = await Promise.race([rolePromise, timeoutPromise])
          .catch(err => {
            console.warn("Role fetch failed or timed out:", err);
            return 'Member'; // Default on failure
          });

          console.log("Role set to:", role);
          setUserRole(role as Role);
        } catch (err) {
          console.error("Error in role fetch:", err);
        // Default to Member on any error
          setUserRole('Member');
        }

      // If user is on login page and already has a session, redirect
        if (router.pathname === '/login' || router.pathname === '/register') {
          console.log("Redirecting from login (5)");
          window.location.href = '/dashboard';
          return;
        }
      } else {
        console.log("No session found (5-alt)");
      }

      console.log("Auth initialization complete (6)");
      setLoading(false);
    } catch (err) {
      console.error('Error during auth initialization:', err);
    // Default to Member role on any error
      setUserRole('Member');
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
            const role = await fetchUserRole(currentUser.id);
            setUserRole(role);
          } catch (roleError) {
            console.error("Error fetching user role:", roleError);
            setUserRole('Member');
          }
        }

          // Don't await profile creation to prevent blocking
        if (currentUser) {
          ensureUserProfile(currentUser.id)
          .then(success => {
            console.log("Profile check after sign-in completed:", success ? "success" : "failed");
          })
          .catch(err => {
            console.error("Profile check after sign-in error:", err);
          });
        }

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
        setUserRole(null);

          // Direct redirect to login page for sign out
        console.log("Redirecting to login after sign out");
        window.location.href = '/login';
        return;
      } else {
          // Update state for other events
        setSession(newSession);
        setUser(newSession?.user || null);

          // Fetch user role if user exists
        if (newSession?.user) {
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
}, [router.pathname ? router.pathname : '']);

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

      // Update state and let auth state change handler handle the redirect
    if (data.session) {
      setSession(data.session);
      setUser(data.user);

        // Fetch user role
      if (data.user) {
        try {
          const role = await fetchUserRole(data.user.id);
          setUserRole(role);
        } catch (roleError) {
          console.error("Error fetching user role:", roleError);
          setUserRole('Member');
        }
      }
    }

    return { error: null };
  } catch (err) {
    console.error('Unexpected error during sign in:', err);
    return { error: err };
  }
};

const signInWithGoogle = async () => {
  try {
    console.log('Attempting to sign in with Google');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    });

    if (error) {
      console.error('Google sign in error:', error);
      return { error };
    }

      // No immediate state update here as this will redirect the user
    console.log('Google sign in initiated:', data);

    return { error: null };
  } catch (err) {
    console.error('Unexpected error during Google sign in:', err);
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

      // Update state and let the auth state change handler handle the redirect
    if (data.session) {
      setSession(data.session);
      setUser(data.user);

        // Set default role for new users
      setUserRole('Member');
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
    setUserRole(null);

      // Redirect
    window.location.href = '/login';
  } catch (error) {
    console.error('Error signing out:', error);
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
    signIn, 
    signInWithGoogle,
    signUp, 
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