// lib/dbSync.ts - Utility to sync user data if profile is missing
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

/**
 * Synchronizes user data in case of incomplete registration
 * (Can be called periodically or when issues are detected)
 */
export async function syncUserProfiles() {
  try {
    // Get all users from Auth
    const { data, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError || !data) {
      console.error('Error fetching auth users:', authError);
      return { success: false, error: authError };
    }
    
    // Type safety check for the response structure
    if (!data.users || !Array.isArray(data.users)) {
      console.error('Unexpected response format from listUsers');
      return { success: false, error: new Error('Unexpected response format from listUsers') };
    }
    
    const authUsers = data.users as User[];
    
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id');
      
    if (profilesError || !profiles) {
      console.error('Error fetching profiles:', profilesError);
      return { success: false, error: profilesError };
    }
    
    // Find users without profiles
    const profileIds = new Set(profiles.map(p => p.id));
    const usersWithoutProfiles = authUsers.filter(
      user => user && typeof user.id === 'string' && !profileIds.has(user.id)
    );
    
    // Create missing profiles
    const profileCreations = usersWithoutProfiles.map(async (user) => {
      const userData = user.user_metadata || {};
      
      return supabase
        .from('profiles')
        .insert({
          id: user.id,
          name: userData.name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          created_at: new Date().toISOString(),
        });
    });
    
    await Promise.all(profileCreations);
    
    return { 
      success: true, 
      syncedCount: usersWithoutProfiles.length 
    };
  } catch (error) {
    console.error('Error syncing user profiles:', error);
    return { success: false, error };
  }
}