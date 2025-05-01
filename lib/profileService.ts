// lib/profileService.ts
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { Profile, Role } from '../types/supabase';

/**
 * A centralized service for handling user profile management
 * This helps eliminate race conditions and provides consistent profile handling
 */
export class ProfileService {
  // Cache for user profiles to reduce database queries
  private static profileCache = new Map<string, { profile: Profile, timestamp: number }>();
  
  // Cache expiration time (15 minutes for better performance)
  private static CACHE_TTL = 15 * 60 * 1000;
  
  /**
   * Get a profile from cache or null if not found/expired
   * 
   * @param userId User ID to check in cache
   * @returns Cached profile or null
   */
  private static getProfileFromCache(userId: string): Profile | null {
    const cached = this.profileCache.get(userId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      return cached.profile;
    }
    
    return null;
  }
  
  /**
   * Add a profile to the cache
   * 
   * @param profile Profile to cache
   */
  private static addProfileToCache(profile: Profile): void {
    this.profileCache.set(profile.id, {
      profile,
      timestamp: Date.now()
    });
  }
  
  /**
   * Clear a profile from the cache
   * 
   * @param userId User ID to clear from cache
   */
  private static clearProfileFromCache(userId: string): void {
    this.profileCache.delete(userId);
  }
  
  /**
   * Creates or updates a user profile, ensuring all required fields are present
   * 
   * @param user The authenticated user object
   * @param additionalData Optional additional data to include in the profile
   * @returns The profile object, or null if creation failed
   */
  static async ensureProfile(user: User | { id: string }, additionalData: any = {}): Promise<Profile | null> {
    if (!user || !user.id) {
      console.error('Cannot ensure profile: Invalid user provided');
      return null;
    }

    try {
      // Check cache first
      const cachedProfile = this.getProfileFromCache(user.id);
      if (cachedProfile) {
        return cachedProfile;
      }
      
      // Step 1: Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // If profile exists and has all required fields, return it
      if (!checkError && existingProfile && existingProfile.name) {
        console.log('Profile exists for user:', user.id);
        const profile = {
          id: existingProfile.id,
          name: existingProfile.name,
          email: existingProfile.email,
          createdAt: existingProfile.created_at,
          role: existingProfile.role as Role || 'Member'
        };
        
        // Add to cache
        this.addProfileToCache(profile);
        
        return profile;
      }

      // Step 2: Prepare data for profile creation/update
      // Handle both full User objects and simple id objects
      const userData = (user as User).user_metadata || {};
      const email = (user as User).email || additionalData.email || '';
      
      const profileData = {
        id: user.id,
        name: additionalData.name || userData.name || userData.full_name || 
              (email ? email.split('@')[0] : 'User'),
        email: email,
        role: additionalData.role || 'Member' as Role, // Default to Member role for new profiles
        created_at: new Date().toISOString(),
      };

      // Step 3: Update or create profile
      let result;

      if (!checkError && existingProfile) {
        // Update existing profile
        console.log('Updating existing profile for user:', user.id);
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user.id)
          .select()
          .single();

        if (updateError) {
          throw new Error(`Failed to update profile: ${updateError.message}`);
        }

        result = updatedProfile;
      } else {
        // Create new profile
        console.log('Creating new profile for user:', user.id);
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (createError) {
          // If direct creation fails, try the API fallback
          return await ProfileService.createProfileViaAPI(user, profileData);
        }

        result = newProfile;
      }

      // Step 4: Convert to frontend format and return
      if (result) {
        const profile = {
          id: result.id,
          name: result.name,
          email: result.email,
          createdAt: result.created_at,
          role: result.role as Role || 'Member'
        };
        
        // Add to cache
        this.addProfileToCache(profile);
        
        return profile;
      }

      return null;
    } catch (error) {
      console.error('Error in ensureProfile:', error);
      // Try API fallback as a last resort
      return await ProfileService.createProfileViaAPI(user);
    }
  }

  /**
   * Fallback method to create a profile via the API endpoint
   * This is used when direct database access fails due to RLS or other issues
   */
  private static async createProfileViaAPI(user: User | { id: string }, profileData?: any): Promise<Profile | null> {
    try {
      console.log('Attempting profile creation via API fallback');
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      if (!token) {
        throw new Error('No authentication token available for API fallback');
      }

      // Prepare the data
      const userData = (user as User).user_metadata || {};
      const email = (user as User).email || '';
      
      const payload = profileData || {
        id: user.id,
        name: userData.name || userData.full_name || (email ? email.split('@')[0] : 'User'),
        email: email || ''
      };

      // Call the API
      const response = await fetch('/api/auth/ensure-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success || !result.profile) {
        throw new Error(result.message || 'API failed to create profile');
      }

      console.log('Profile created successfully via API');
      
      // Return the profile in frontend format
      const profile = {
        id: result.profile.id,
        name: result.profile.name,
        email: result.profile.email,
        createdAt: result.profile.created_at,
        role: result.profile.role as Role || 'Member'
      };
      
      // Add to cache
      this.addProfileToCache(profile);
      
      return profile;
    } catch (error) {
      console.error('API profile creation fallback failed:', error);
      return null;
    }
  }

  /**
   * Gets a user's role, creating a profile if needed
   * 
   * @param userId The user ID to get the role for
   * @returns The user's role, defaulting to 'Member' if not found
   */
  static async getUserRole(userId: string): Promise<Role> {
    try {
      if (!userId) {
        console.error('Cannot get role: No user ID provided');
        return 'Member';
      }
      
      // Check cache first
      const cachedProfile = this.getProfileFromCache(userId);
      if (cachedProfile) {
        return cachedProfile.role;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        // If the profile doesn't exist, try to create it with the current auth user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && user.id === userId) {
          const profile = await ProfileService.ensureProfile(user);
          return profile?.role || 'Member';
        }
        
        console.error('Error fetching user role:', error);
        return 'Member';
      }

      return data?.role as Role || 'Member';
    } catch (error) {
      console.error('Error in getUserRole:', error);
      return 'Member';
    }
  }

  /**
   * Updates a user's role
   * 
   * @param userId The user ID to update the role for
   * @param role The new role to set
   * @returns Success status
   */
  static async updateUserRole(userId: string, role: Role): Promise<boolean> {
    try {
      if (!userId || !role) {
        console.error('Cannot update role: Missing user ID or role');
        return false;
      }

      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user role:', error);
        return false;
      }
      
      // Clear from cache to ensure fresh data on next fetch
      this.clearProfileFromCache(userId);

      return true;
    } catch (error) {
      console.error('Error in updateUserRole:', error);
      return false;
    }
  }

  /**
   * Gets a list of all user profiles
   * 
   * @returns Array of user profiles
   */
  static async getAllProfiles(): Promise<Profile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');

      if (error) {
        console.error('Error fetching profiles:', error);
        return [];
      }

      return (data || []).map(profile => ({
        id: profile.id,
        name: profile.name || 'Unnamed User',
        email: profile.email || '',
        createdAt: profile.created_at,
        role: profile.role as Role || 'Member'
      }));
    } catch (error) {
      console.error('Error in getAllProfiles:', error);
      return [];
    }
  }

  /**
   * Synchronizes all user profiles to ensure consistency
   * This is useful for admin operations or scheduled tasks
   * 
   * @returns Object with success status and count of synced profiles
   */
  static async syncAllUserProfiles(): Promise<{ 
    success: boolean; 
    syncedCount?: number; 
    error?: any 
  }> {
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
      
      const authUsers = data.users;
      console.log(`Found ${authUsers.length} users in auth system`);
      
      // Get all existing profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id');
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return { success: false, error: profilesError };
      }
      
      console.log(`Found ${profiles ? profiles.length : 0} existing profiles`);
      
      // Find users without profiles
      const profileIds = new Set(profiles ? profiles.map(p => p.id) : []);
      const usersWithoutProfiles = authUsers.filter(user => 
        user && typeof user.id === 'string' && !profileIds.has(user.id)
      );
      
      console.log(`Found ${usersWithoutProfiles.length} users without profiles`);
      
      // Create missing profiles - use let instead of const for counters
      let createdCount = 0;
      let failedCount = 0;
      
      await Promise.all(
        usersWithoutProfiles.map(async (user) => {
          try {
            await this.ensureProfile(user);
            createdCount++;
          } catch (error) {
            console.error(`Error creating profile for user ${user.id}:`, error);
            failedCount++;
          }
        })
      );
      
      console.log(`Profile sync complete. Created ${createdCount} profiles. Failed: ${failedCount}`);
      
      return { 
        success: true,
        syncedCount: createdCount
      };
    } catch (error) {
      console.error('Error in profile synchronization:', error);
      return { success: false, error };
    }
  }
  
  /**
   * Get profiles for multiple users in a single query, using cache
   * 
   * @param userIds Array of user IDs to fetch profiles for
   * @returns Object mapping user IDs to their profiles
   */
  static async getBulkProfiles(userIds: string[]): Promise<Record<string, Profile>> {
    if (!userIds.length) return {};
    
    const result: Record<string, Profile> = {};
    const missingIds: string[] = [];
    
    // First check cache for all profiles
    userIds.forEach(id => {
      const cached = this.getProfileFromCache(id);
      if (cached) {
        result[id] = cached;
      } else {
        missingIds.push(id);
      }
    });
    
    // If all profiles were cached, return immediately
    if (!missingIds.length) {
      return result;
    }
    
    // Fetch missing profiles in a single query
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', missingIds);
        
      if (error || !data) {
        console.error('Error fetching bulk profiles:', error);
        // Return what we have from cache
        return result;
      }
      
      // Add fetched profiles to result and cache
      data.forEach(profile => {
        const frontendProfile = {
          id: profile.id,
          name: profile.name || 'Unknown User',
          email: profile.email || '',
          createdAt: profile.created_at,
          role: profile.role as Role || 'Member'
        };
        
        result[profile.id] = frontendProfile;
        this.addProfileToCache(frontendProfile);
      });
      
      return result;
    } catch (error) {
      console.error('Error in getBulkProfiles:', error);
      // Return what we have from cache
      return result;
    }
  }
}