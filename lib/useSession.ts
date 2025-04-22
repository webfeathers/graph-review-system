// lib/useSession.ts
import { useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { SessionService, SessionEvent } from './sessionService';

/**
 * Hook for components to directly access session state and events
 * This is useful for components that need granular control over session handling
 */
export function useSession() {
  const [session, setSession] = useState<Session | null>(SessionService.getSession());
  const [user, setUser] = useState<User | null>(SessionService.getUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(SessionService.isAuthenticated());
  const [lastEvent, setLastEvent] = useState<SessionEvent | null>(null);

  useEffect(() => {
    // Handle session events
    const handleSessionChange = (event: SessionEvent, newSession: Session | null, newUser: User | null) => {
      setSession(newSession);
      setUser(newUser);
      setIsAuthenticated(!!newSession);
      setLastEvent(event);
    };

    // Subscribe to session events
    const unsubscribe = SessionService.addEventListener(handleSessionChange);
    
    // Clean up subscription
    return unsubscribe;
  }, []);

  // Method to manually refresh the session
  const refreshSession = async (): Promise<Session | null> => {
    const refreshedSession = await SessionService.refreshSession();
    return refreshedSession;
  };

  return {
    session,
    user,
    isAuthenticated,
    lastEvent,
    refreshSession,
    signOut: SessionService.signOut,
    signInWithGoogle: SessionService.signInWithGoogle
  };
}