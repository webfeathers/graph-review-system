// components/AuthProvider.tsx integrated with SessionService
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Session, User } from '@supabase/supabase-js';
import { Role } from '../types/supabase';
import { ProfileService } from '../lib/profileService';
import { SessionService, SessionEvent } from '../lib/sessionService';

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

// Cache for user roles to reduce database queries
const userRoleCache = new Map<string, { role: Role, timestamp: number }>();

// Role cache expiration time (5 minutes)
const ROLE_CACHE_TTL = 5 * 60 * 1000;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Initialize SessionService on mount
  useEffect(() => {
    // Cleanup function to run on unmount
    let isUnmounted = false;
    let sessionListener: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        console.log("Initializing auth with SessionService...");
        setLoading(true);
        
        // Initialize the session service
        await SessionService.initialize();
        
        // Get initial session state
        const initialSession = SessionService.getSession();
        const initialUser = SessionService.getUser();
        
        if (!isUnmounted) {
          setSession(initialSession);
          setUser(initialUser);
        }
        
        if (initialUser) {
          console.log("Initial user found, ensuring profile exists");
          // Ensure profile and get role
          await loadUserRole(initialUser.id);
          
          // Redirect to dashboard if already logged in and on auth pages
          if (router.pathname === '/login' || router.pathname === '/register') {
            console.log("User already logged in, redirecting to dashboard");
            router.replace('/dashboard');
          }
        }
        
        if (!isUnmounted) {
          setLoading(false);
        }
        console.log("Auth initialization complete");
        
        // Set up session event listener
        if (!isUnmounted) {
          sessionListener = SessionService.addEventListener(handleSessionEvent);
        }
      } catch (err) {
        console.error('Error during auth initialization:', err);
        if (!isUnmounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();
    
    // Cleanup on unmount
    return () => {
      isUnmounted = true;
      if (sessionListener) {
        sessionListener();
      }
    };
  }, [router]);

  // Load user role with caching
  const loadUserRole = async (userId: string): Promise<Role | null> => {
    try {
      // Check cache first
      const cached = userRoleCache.get(userId);
      const now = Date.now();
      
      if (cached && (now - cached.timestamp) < ROLE_CACHE_TTL) {
        setUserRole(cached.role);
        return cached.role;
      }
      
      // Not in cache or expired, fetch from database
      const profile = await ProfileService.ensureProfile({ id: userId } as User);
      
      if (profile) {
        // Update cache
        userRoleCache.set(userId, { 
          role: profile.role, 
          timestamp: now 
        });
        
        setUserRole(profile.role);
        return profile.role;
      } else {
        console.warn("Could not find or create profile, defaulting to Member role");
        setUserRole('Member');
        
        // Still cache the default role to prevent excessive retries
        userRoleCache.set(userId, { 
          role: 'Member', 
          timestamp: now 
        });
        
        return 'Member';
      }
    } catch (error) {
      console.error('Error loading user role:', error);
      setUserRole('Member');
      return 'Member';
    }
  };

  // Handle session events from the SessionService
  const handleSessionEvent = async (
    event: SessionEvent, 
    newSession: Session | null, 
    newUser: User | null
  ) => {
    console.log('Auth provider received session event:', event);
    
    setSession(newSession);
    setUser(newUser);
    
    switch (event) {
      case 'SIGNED_IN':
        if (newUser) {
          // Load user role
          await loadUserRole(newUser.id);
          
          // Redirect to dashboard if on auth pages
          if (router.pathname === '/login' || router.pathname === '/register') {
            router.replace('/dashboard');
          }
        }
        break;
        
      case 'SIGNED_OUT':
      case 'SESSION_EXPIRED':
        // Clear state
        setUserRole(null);
        
        // Clear role cache
        userRoleCache.clear();
        
        // Redirect to login
        if (router.pathname !== '/login' && router.pathname !== '/register') {
          router.replace('/login');
        }
        break;
        
      case 'TOKEN_REFRESHED':
        // No need to update user role here unless it's null
        if (newUser && !userRole) {
          await loadUserRole(newUser.id);
        }
        break;
        
      case 'USER_UPDATED':
        // Refresh role if user is updated
        if (newUser) {
          // Clear from cache to ensure fresh data
          userRoleCache.delete(newUser.id);
          await loadUserRole(newUser.id);
        }
        break;
    }
    
    setLoading(false);
  };

  // Function to check if current user is admin
  const isAdmin = (): boolean => {
    return userRole === 'Admin';
  };

  // Function to refresh the user's role from the database
  const refreshUserRole = async (): Promise<Role | null> => {
    if (!user) return null;
    
    try {
      // Clear from cache to ensure fresh data
      userRoleCache.delete(user.id);
      return await loadUserRole(user.id);
    } catch (error) {
      console.error('Error refreshing user role:', error);
      return null;
    }
  };

  // Function to ensure user profile exists
  const ensureUserProfile = async (userId?: string, userData: any = {}): Promise<boolean> => {
    try {
      // If no userId specified, use current user
      const targetUser = userId ? { id: userId } as User : user;
      
      if (!targetUser) {
        console.log("No user available for profile check");
        return false;
      }
      
      // Use the ProfileService to ensure profile exists
      const profile = await ProfileService.ensureProfile(targetUser, userData);
      
      if (profile) {
        // Update role in state if this is for the current user
        if (targetUser.id === user?.id) {
          setUserRole(profile.role);
          // Update cache
          userRoleCache.set(targetUser.id, { 
            role: profile.role, 
            timestamp: Date.now() 
          });
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error in ensureUserProfile:', error);
      return false;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    try {
      console.log('Attempting to sign in with Google');
      setLoading(true);
      
      const { data, error } = await SessionService.signInWithGoogle(
        window.location.origin + '/dashboard'
      );

      if (error) {
        console.error('Google sign in error:', error);
        setLoading(false);
        return { error };
      }

      console.log('Google sign in initiated:', data);
      
      // Don't set loading to false here as we're redirecting
      return { error: null };
    } catch (err) {
      console.error('Unexpected error during Google sign in:', err);
      setLoading(false);
      return { error: err };
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      console.log('Signing out');
      setLoading(true);
      
      // Use SessionService to sign out
      const { error } = await SessionService.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
      }
      
      // Clear state
      setUser(null);
      setSession(null);
      setUserRole(null);
      
      // Clear role cache
      userRoleCache.clear();
      
      setLoading(false);
    } catch (error) {
      console.error('Error signing out:', error);
      
      // Clear state
      setUser(null);
      setSession(null);
      setUserRole(null);
      
      // Clear role cache
      userRoleCache.clear();
      
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