// components/AuthProvider.tsx integrated with SessionService
import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Session, User, SupabaseClient } from '@supabase/supabase-js';
import { Role } from '../types/supabase';
import { ProfileService } from '../lib/profileService';
import { SessionService, SessionEvent } from '../lib/sessionService';
import { supabase } from '../lib/supabase'; // Import the existing client
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/env';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  userRole: Role | null;
  supabaseClient: SupabaseClient;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
  ensureUserProfile: (userId?: string, userData?: any) => Promise<boolean>;
  isAdmin: () => boolean;
  refreshUserRole: () => Promise<Role | null>;
  invalidateRoleCache: () => void;
};

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Type for cache entry
type RoleCacheEntry = {
  role: Role;
  timestamp: number;
  version: number;
};

// Cache for user roles to reduce database queries
const userRoleCache = new Map<string, RoleCacheEntry>();

// Increase cache TTL to 15 minutes for better performance
const ROLE_CACHE_TTL = 15 * 60 * 1000;

// Global version counter for cache invalidation
let globalCacheVersion = 0;

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_PROFILE_CHECKS = 10; // Maximum profile checks per minute

// Rate limiting state
const profileCheckCounts = new Map<string, { count: number; windowStart: number }>();

// Add a session cache
const SESSION_CACHE_KEY = 'auth_session_cache';
const SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for session data
let sessionCache: {
  session: Session | null;
  timestamp: number;
} | null = null;

// Function to invalidate all role caches
const invalidateAllRoleCaches = () => {
  globalCacheVersion++;
  userRoleCache.clear();
};

// Function to check if cache entry is valid
const isCacheValid = (cached: RoleCacheEntry | undefined): boolean => {
  if (!cached) return false;
  const now = Date.now();
  return (now - cached.timestamp) < ROLE_CACHE_TTL && cached.version === globalCacheVersion;
};

// Function to check rate limit
const isRateLimited = (userId: string): boolean => {
  const now = Date.now();
  const userCount = profileCheckCounts.get(userId);

  if (!userCount || (now - userCount.windowStart) > RATE_LIMIT_WINDOW) {
    // Reset counter for new window
    profileCheckCounts.set(userId, { count: 1, windowStart: now });
    return false;
  }

  if (userCount.count >= MAX_PROFILE_CHECKS) {
    return true;
  }

  // Increment counter
  userCount.count += 1;
  return false;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  // Initialize SessionService on mount
  useEffect(() => {
    let isUnmounted = false;
    let sessionListener: (() => void) | null = null;

    const initializeAuth = async () => {
      try {
        if (isUnmounted || initialized) return;
        
        console.log("Initializing auth with SessionService...");
        
        // Initialize the session service
        await SessionService.initialize();
        
        // Get initial session state
        const initialSession = SessionService.getSession();
        const initialUser = SessionService.getUser();
        
        if (!isUnmounted) {
          // Set initial state
          setSession(initialSession);
          setUser(initialUser);
          setLoading(false);
          setInitialized(true);
          
          // Then load role if we have a user
          if (initialUser) {
            const role = await loadUserRole(initialUser.id);
            if (!isUnmounted) {
              setUserRole(role);
            }
          }
          
          // Set up session event listener after initial state is set
          sessionListener = SessionService.addEventListener(handleSessionEvent);
        }
      } catch (err) {
        console.error('Error during auth initialization:', err);
        if (!isUnmounted) {
          setSession(null);
          setUser(null);
          setUserRole(null);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();
    
    return () => {
      isUnmounted = true;
      if (sessionListener) {
        sessionListener();
      }
    };
  }, []);

  // Load user role with improved caching
  const loadUserRole = async (userId: string): Promise<Role | null> => {
    try {
      // Check cache first with longer TTL
      const cached = userRoleCache.get(userId);
      
      if (cached && isCacheValid(cached)) {
        if (process.env.NODE_ENV === 'development') {
          console.log("Using cached role:", cached.role);
        }
        return cached.role;
      }
      
      // Check rate limit before making database call
      if (isRateLimited(userId)) {
        console.warn(`Rate limit exceeded for user ${userId}. Using cached or default role.`);
        return cached?.role || 'Member';
      }

      // Not in cache or expired, fetch from database
      const profile = await ProfileService.ensureProfile({ id: userId } as User);
      
      if (profile) {
        if (process.env.NODE_ENV === 'development') {
          console.log("Loaded profile with role:", profile.role);
        }
        // Update cache with current version and longer TTL
        userRoleCache.set(userId, { 
          role: profile.role, 
          timestamp: Date.now(),
          version: globalCacheVersion
        });
        
        return profile.role;
      }

      console.warn(`No profile found for user ${userId}, using default role`);
      const defaultRole: Role = 'Member';
      
      // Cache the default role
      userRoleCache.set(userId, { 
        role: defaultRole, 
        timestamp: Date.now(),
        version: globalCacheVersion
      });
      
      return defaultRole;
    } catch (error) {
      console.error('Error loading user role:', error);
      return null;
    }
  };

  // Handle session events
  const handleSessionEvent = async (
    event: SessionEvent, 
    newSession: Session | null, 
    newUser: User | null
  ) => {
    console.log(`AuthProvider received session event: ${event}`);
    setSession(newSession);
    setUser(newUser);
    
    if (newUser) {
      setUserRole(await loadUserRole(newUser.id));
    } else {
      setUserRole(null);
    }
  };

  // <<< Wrap isAdmin in useCallback, dependent on userRole >>>
  const isAdmin = useCallback((): boolean => {
    return userRole === 'Admin';
  }, [userRole]);

  // Function to refresh the user's role from the database
  const refreshUserRole = async (): Promise<Role | null> => {
    if (!user) return null;
    
    try {
      // Clear from cache to ensure fresh data
      invalidateAllRoleCaches();
      return await loadUserRole(user.id);
    } catch (error) {
      console.error('Error refreshing user role:', error);
      return null;
    }
  };

  // Function to ensure user profile exists with rate limiting
  const ensureUserProfile = async (userId?: string, userData: any = {}): Promise<boolean> => {
    try {
      // If no userId specified, use current user
      const targetUser = userId ? { id: userId } as User : user;
      
      if (!targetUser) {
        console.log("No user available for profile check");
        return false;
      }

      // Check rate limit
      if (isRateLimited(targetUser.id)) {
        console.warn(`Rate limit exceeded for user ${targetUser.id}. Skipping profile check.`);
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
            timestamp: Date.now(),
            version: globalCacheVersion
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

  // Function to handle Google sign-in with proper error handling
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await SessionService.signInWithGoogle();

      if (error) {
        // Specific error handling based on error type
        switch (error.message) {
          case 'Popup closed by user':
            return { error: { message: 'Sign-in cancelled by user' } };
          case 'Configuration':
            console.error('Google authentication configuration error:', error);
            return { error: { message: 'Authentication service misconfigured. Please contact support.' } };
          case 'PopupBlockedError':
            return { error: { message: 'Popup was blocked. Please allow popups for this site.' } };
          default:
            console.error('Google sign-in error:', error);
            return { error: { message: 'Failed to sign in with Google. Please try again.' } };
        }
      }

      return { error: null };
    } catch (error) {
      console.error('Unexpected error during Google sign-in:', error);
      return { error: { message: 'An unexpected error occurred. Please try again.' } };
    } finally {
      setLoading(false);
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
      invalidateAllRoleCaches();
      
      setLoading(false);
    } catch (error) {
      console.error('Error signing out:', error);
      
      // Clear state
      setUser(null);
      setSession(null);
      setUserRole(null);
      
      // Clear role cache
      invalidateAllRoleCaches();
      
      setLoading(false);
    }
  };

  // Function to invalidate role cache
  const invalidateRoleCache = () => {
    if (user) {
      invalidateAllRoleCaches();
    }
  };

  // Memoize the context value
  const contextValue = useMemo(() => ({
    session,
    user,
    userRole,
    supabaseClient: supabase, // Use the imported client
    signInWithGoogle,
    signOut,
    loading,
    ensureUserProfile,
    isAdmin,
    refreshUserRole,
    invalidateRoleCache
  }), [
    session,
    user,
    userRole,
    loading,
    isAdmin
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Export both the hook and the provider
export const useAuth = () => useContext(AuthContext);
export default AuthProvider;