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

// Role cache expiration time (5 minutes)
const ROLE_CACHE_TTL = 5 * 60 * 1000;

// Global version counter for cache invalidation
let globalCacheVersion = 0;

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_PROFILE_CHECKS = 10; // Maximum profile checks per minute

// Rate limiting state
const profileCheckCounts = new Map<string, { count: number; windowStart: number }>();

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
        
        console.log("Initial auth state:", {
          session: initialSession,
          user: initialUser
        });

        if (!isUnmounted) {
          setSession(initialSession);
          setUser(initialUser);
          
          if (initialUser) {
            // Load user role
            const role = await loadUserRole(initialUser.id);
            console.log("Loaded initial user role:", role);
          }
        }
        
        // Set up session event listener
        if (!isUnmounted) {
          sessionListener = SessionService.addEventListener(handleSessionEvent);
        }

        setLoading(false);
        console.log("Auth initialization complete");
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
  }, []);

  // Load user role with improved caching and rate limiting
  const loadUserRole = async (userId: string): Promise<Role | null> => {
    try {
      console.log("Loading user role for:", userId);
      
      // Check cache first
      const cached = userRoleCache.get(userId);
      
      if (cached && isCacheValid(cached)) {
        console.log("Using cached role:", cached.role);
        setUserRole(cached.role);
        return cached.role;
      }
      
      // Check rate limit before making database call
      if (isRateLimited(userId)) {
        console.warn(`Rate limit exceeded for user ${userId}. Using cached or default role.`);
        // Use cached value even if expired, otherwise use default role
        const role = cached?.role || 'Member';
        setUserRole(role);
        return role;
      }

      // Not in cache or expired, fetch from database
      const profile = await ProfileService.ensureProfile({ id: userId } as User);
      
      if (profile) {
        console.log("Loaded profile with role:", profile.role);
        // Update cache with current version
        userRoleCache.set(userId, { 
          role: profile.role, 
          timestamp: Date.now(),
          version: globalCacheVersion
        });
        
        setUserRole(profile.role);
        return profile.role;
      }

      console.warn(`No profile found for user ${userId}, creating with default role`);
      const defaultRole: Role = 'Member';
      
      // Cache the default role but with shorter TTL
      userRoleCache.set(userId, { 
        role: defaultRole, 
        timestamp: Date.now() - (ROLE_CACHE_TTL / 2), // Expire in half the normal time
        version: globalCacheVersion
      });
      
      setUserRole(defaultRole);
      return defaultRole;
    } catch (error) {
      console.error('Error loading user role:', error);
      // Don't cache errors
      setUserRole(null);
      return null;
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
        invalidateAllRoleCaches();
        
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
          invalidateAllRoleCaches();
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
      refreshUserRole,
      invalidateRoleCache
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Export both the hook and the provider
export const useAuth = () => useContext(AuthContext);
export default AuthProvider;