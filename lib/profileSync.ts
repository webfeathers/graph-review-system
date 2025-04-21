// lib/profileSync.ts
import { supabase } from './supabase';
import { User, UserResponse } from '@supabase/supabase-js';

// Define the type for the admin.listUsers response
interface UserListResponse {
  users: User[];
  total: number;
}

/**
 * Utility to check and fix missing user profiles
 * This can be run on app initialization or via an admin API endpoint
 */
export async function syncUserProfiles() {
  try {
    console.log('Starting profile synchronization...');
    
    // Get all auth users (requires service role key!)
    const { data, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return { success: false, error: authError };
    }
    
    if (!data || !Array.isArray(data.users)) {
      console.error('No users data returned from auth.admin.listUsers');
      return { success: false, error: new Error('No users data returned') };
    }
    
    const authUsers = data.users as User[];
    console.log(`Found ${authUsers.length} users in auth system`);
    
    // Get all existing profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id');
      
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return { success: false, error: profilesError };
    }
    
    console.log(`Found ${profiles.length} existing profiles`);
    
    // Find users without profiles
    const profileIds = new Set(profiles ? profiles.map(p => p.id) : []);
    const usersWithoutProfiles = authUsers.filter(user => 
      user && typeof user.id === 'string' && !profileIds.has(user.id)
    );
    
    console.log(`Found ${usersWithoutProfiles.length} users without profiles`);
    
    // Create missing profiles
    const results = await Promise.allSettled(
      usersWithoutProfiles.map(async (user) => {
        if (!user || typeof user.id !== 'string') {
          return { userId: 'unknown', success: false, error: 'Invalid user data' };
        }
        
        const userData = user.user_metadata || {};
        const name = userData.name || (user.email ? user.email.split('@')[0] : 'User');
        
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            name,
            email: user.email || '',
            created_at: new Date().toISOString(),
          });
          
        if (error) {
          console.error(`Error creating profile for user ${user.id}:`, error);
          return { userId: user.id, success: false, error };
        }
        
        console.log(`Created profile for user ${user.id}`);
        return { userId: user.id, success: true };
      })
    );
    
    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
    const failed = results.filter(r => r.status === 'rejected' || !(r.value as any).success).length;
    
    console.log(`Profile sync complete. Created ${successful} profiles. Failed: ${failed}`);
    
    return { 
      success: true,
      totalUsers: authUsers.length,
      existingProfiles: profiles.length,
      missingProfiles: usersWithoutProfiles.length,
      createdProfiles: successful,
      failedCreations: failed
    };
    
  } catch (error) {
    console.error('Error in profile synchronization:', error);
    return { success: false, error };
  }
}

/**
 * Check and create profile for a single user if needed
 * Can be used after authentication to ensure profile exists
 */
export async function ensureUserProfile(user: User | null) {
  if (!user || typeof user.id !== 'string') {
    console.error('Invalid user provided to ensureUserProfile');
    return { success: false, error: new Error('Invalid user') };
  }
  
  try {
    // Check if profile exists
    const { data: profile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();
      
    if (!checkError && profile) {
      // Profile exists, nothing to do
      return { success: true, created: false };
    }
    
    // Create new profile
    const userData = user.user_metadata || {};
    const name = userData.name || (user.email ? user.email.split('@')[0] : 'User');
    
    const { error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        name,
        email: user.email || '',
        created_at: new Date().toISOString(),
      });
      
    if (createError) {
      console.error(`Error creating profile for user ${user.id}:`, createError);
      return { success: false, error: createError };
    }
    
    console.log(`Created profile for user ${user.id}`);
    return { success: true, created: true };
    
  } catch (error) {
    console.error(`Error ensuring profile for user ${user.id}:`, error);
    return { success: false, error };
  }
}