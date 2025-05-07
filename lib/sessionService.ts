// lib/sessionService.ts
import { supabase } from './supabase';
import { Session, User } from '@supabase/supabase-js';

/**
 * Session events that can be subscribed to
 */
export type SessionEvent = 
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'SESSION_EXPIRED';

/**
 * Listener function type for session events
 */
export type SessionEventListener = (event: SessionEvent, session: Session | null, user: User | null) => void;

/**
 * Service to handle session management, providing a centralized way to:
 * - Manage authentication sessions
 * - Handle token refresh
 * - Synchronize sessions across tabs
 * - Manage persistence
 * - Handle secure cookie storage
 */
export class SessionService {
  private static listeners: SessionEventListener[] = [];
  private static refreshTimerId: NodeJS.Timeout | null = null;
  private static initializationPromise: Promise<void> | null = null;
  private static currentSession: Session | null = null;
  private static isRefreshing = false;
  private static isInitialized = false;
  
  /**
   * Initialize the session service
   * This should be called once at application startup
   */
  static async initialize(): Promise<void> {
    // Ensure we only initialize once
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = (async () => {
      try {
        console.log('Initializing SessionService...');
        
        // Get initial session first
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting initial session:', error);
          this.currentSession = null;
          this.notifyListeners('SIGNED_OUT', null, null);
          this.isInitialized = true;
          return;
        }
        
        this.currentSession = data.session;
        
        // Set up auth state change listener after getting initial session
        supabase.auth.onAuthStateChange((event, session) => {
          console.log('Auth state change event:', event);
          this.handleAuthStateChange(event, session);
        });
        
        if (data.session) {
          console.log('Initial session found');
          this.setupRefreshTimer(data.session);
          this.notifyListeners('SIGNED_IN', data.session, data.session.user);
        } else {
          console.log('No initial session found');
          this.notifyListeners('SIGNED_OUT', null, null);
        }
        
        // Listen for storage events to sync across tabs
        if (typeof window !== 'undefined') {
          window.addEventListener('storage', this.handleStorageEvent);
        }
        
        this.isInitialized = true;
        console.log('SessionService initialized successfully');
      } catch (error) {
        console.error('Error initializing SessionService:', error);
        this.notifyListeners('SIGNED_OUT', null, null);
        this.isInitialized = true;
      }
    })();
    
    return this.initializationPromise;
  }
  
  /**
   * Check if the service is initialized
   */
  static isServiceInitialized(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Clean up listeners and timers
   * Should be called when the application is shutting down
   */
  static cleanup(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }
    
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
    
    this.listeners = [];
    this.currentSession = null;
    this.initializationPromise = null;
  }
  
  /**
   * Add a listener for session events
   * 
   * @param listener The listener function to add
   * @returns A function to remove the listener
   */
  static addEventListener(listener: SessionEventListener): () => void {
    this.listeners.push(listener);
    
    // Return a function to remove this listener
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  /**
   * Get the current session
   * 
   * @returns The current session or null if not authenticated
   */
  static getSession(): Session | null {
    if (!this.isInitialized) {
      console.warn('SessionService not initialized');
      return null;
    }
    return this.currentSession;
  }
  
  /**
   * Get the current user
   * 
   * @returns The current user or null if not authenticated
   */
  static getUser(): User | null {
    if (!this.isInitialized) {
      console.warn('SessionService not initialized');
      return null;
    }
    return this.currentSession?.user || null;
  }
  
  /**
   * Check if the user is authenticated
   * 
   * @returns True if the user is authenticated
   */
  static isAuthenticated(): boolean {
    if (!this.isInitialized) {
      console.warn('SessionService not initialized');
      return false;
    }
    return !!this.currentSession;
  }
  
  /**
   * Sign in with Google
   * 
   * @returns The result of the sign in attempt
   */
  static async signInWithGoogle(): Promise<{ data: any, error: any }> {
    try {
      // Determine redirect target: if `returnTo` query param exists, use it; otherwise default to dashboard
      const isBrowser = typeof window !== 'undefined';
      let finalRedirectUrl: string;
      if (isBrowser) {
        const params = new URLSearchParams(window.location.search);
        const returnTo = params.get('returnTo');
        if (returnTo) {
          finalRedirectUrl = `${window.location.origin}${returnTo}`;
        } else {
          finalRedirectUrl = `${window.location.origin}/dashboard`;
        }
      } else {
        finalRedirectUrl = `${window.location.origin}/dashboard`;
      }

      console.log('Using redirect URL for OAuth:', finalRedirectUrl);
      
      return await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: finalRedirectUrl }
      });
    } catch (error) {
      console.error('Error signing in with Google:', error);
      return { data: null, error };
    }
  }
  
  /**
   * Sign out the current user
   * 
   * @returns The result of the sign out attempt
   */
  static async signOut(): Promise<{ error: any }> {
    try {
      // Set a flag for a clean logout
      if (typeof window !== 'undefined') {
        localStorage.setItem('clean_logout', 'true');
      }
      
      // Clear refresh timer
      if (this.refreshTimerId) {
        clearTimeout(this.refreshTimerId);
        this.refreshTimerId = null;
      }
      
      // Perform sign out via Supabase
      const { error } = await supabase.auth.signOut();
      
      if (!error) {
        this.currentSession = null;
        this.notifyListeners('SIGNED_OUT', null, null);
      }
      
      return { error };
    } catch (error) {
      console.error('Error signing out:', error);
      return { error };
    }
  }
  
  /**
   * Manually refresh the session token
   * 
   * @returns The new session or null if refresh failed
   */
  static async refreshSession(): Promise<Session | null> {
    if (this.isRefreshing) {
      console.log('Token refresh already in progress, skipping');
      return this.currentSession;
    }
    
    this.isRefreshing = true;
    
    try {
      console.log('Manually refreshing token...');
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error refreshing token:', error);
        
        // If refresh fails due to expired session, sign out
        if (error.message.includes('expired')) {
          console.log('Session expired, signing out');
          this.currentSession = null;
          this.notifyListeners('SESSION_EXPIRED', null, null);
          await this.signOut();
        }
        
        return null;
      }
      
      if (data.session) {
        console.log('Token refreshed successfully');
        this.currentSession = data.session;
        this.setupRefreshTimer(data.session);
        this.notifyListeners('TOKEN_REFRESHED', data.session, data.session.user);
        return data.session;
      }
      
      return null;
    } catch (error) {
      console.error('Unexpected error refreshing token:', error);
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }
  
  /**
   * Private method to handle auth state changes from Supabase
   */
  private static async handleAuthStateChange(event: string, session: Session | null): Promise<void> {
    // Convert Supabase events to our event types
    let eventType: SessionEvent;
    
    switch (event) {
      case 'SIGNED_IN':
        eventType = 'SIGNED_IN';
        break;
      case 'SIGNED_OUT':
        eventType = 'SIGNED_OUT';
        break;
      case 'TOKEN_REFRESHED':
        eventType = 'TOKEN_REFRESHED';
        break;
      case 'USER_UPDATED':
        eventType = 'USER_UPDATED';
        break;
      default:
        console.log('Unhandled auth event:', event);
        return;
    }
    
    // Update current session
    this.currentSession = session;
    
    // Set up refresh timer if we have a session
    if (session) {
      this.setupRefreshTimer(session);
    } else if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
      this.refreshTimerId = null;
    }
    
    // Notify listeners
    this.notifyListeners(eventType, session, session?.user || null);
    
    // Sync with local storage for cross-tab communication
    if (typeof window !== 'undefined') {
      if (session) {
        // Just store a flag that the session changed, not the session itself
        localStorage.setItem('auth_state_changed', Date.now().toString());
      } else {
        localStorage.removeItem('auth_state_changed');
      }
    }
  }
  
  /**
   * Private method to set up the refresh timer
   */
  private static setupRefreshTimer(session: Session): void {
    if (this.refreshTimerId) {
      clearTimeout(this.refreshTimerId);
    }
    
    // Calculate when to refresh (5 minutes before expiry)
    const expiresAt = session.expires_at || 0;
    const expiresIn = expiresAt * 1000 - Date.now() - 5 * 60 * 1000; // 5 minutes before expiry
    
    // Don't set refresh timer if already expired or about to expire
    if (expiresIn <= 0) {
      console.log('Session already expired or about to expire, refreshing now');
      this.refreshSession();
      return;
    }
    
    console.log(`Setting up token refresh in ${Math.round(expiresIn / 1000)} seconds`);
    
    this.refreshTimerId = setTimeout(() => {
      this.refreshSession();
    }, expiresIn);
  }
  
  /**
   * Private method to handle storage events for cross-tab communication
   */
  private static handleStorageEvent = async (event: StorageEvent): Promise<void> => {
    if (event.key === 'auth_state_changed') {
      console.log('Auth state changed in another tab, syncing session');
      
      // Get the latest session
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error syncing session across tabs:', error);
        return;
      }
      
      // If the session state is different, update it
      const wasAuthenticated = !!this.currentSession;
      const isAuthenticated = !!data.session;
      
      if (wasAuthenticated !== isAuthenticated) {
        this.currentSession = data.session;
        
        if (isAuthenticated) {
          this.setupRefreshTimer(data.session);
          this.notifyListeners('SIGNED_IN', data.session, data.session.user);
        } else {
          if (this.refreshTimerId) {
            clearTimeout(this.refreshTimerId);
            this.refreshTimerId = null;
          }
          this.notifyListeners('SIGNED_OUT', null, null);
        }
      }
    }
  };
  
  /**
   * Private method to notify all listeners of a session event
   */
  private static notifyListeners(
    event: SessionEvent, 
    session: Session | null,
    user: User | null
  ): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, session, user);
      } catch (error) {
        console.error('Error in session event listener:', error);
      }
    });
  }
}