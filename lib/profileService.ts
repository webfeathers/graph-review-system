// lib/profileService.ts
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { Profile, Role } from '../types/supabase';

/**
 * A centralized service for handling user profile management
 * This helps eliminate race conditions and provides consistent profile handling
 */
export class ProfileService {
  /**
   * Creates or updates a user profile, ensuring all required fields are present
   * 
   * @param user The authenticated user object
   * @returns The profile object, or null if creation failed
   */
  static async ensureProfile(user: User): Promise<Profile | null> {
    if (!user || !user.id) {
      console.error('Cannot ensure profile: Invalid user provided');
      return null;
    }

    try {
      // Step 1: Check if profile already exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // If profile exists and has all required fields, return it
      if (!checkError && existingProfile && existingProfile.name) {
        console.log('Profile exists for user:', user.id);
        return {
          id: existingProfile.id,
          name: existingProfile.name,
          email: existingProfile.email,
          createdAt: existingProfile.created_at,
          role: existingProfile.role as Role || 'Member'
        };
      }

      // Step 2: Prepare data for profile creation/update
      const userData = user.user_metadata || {};
      
      const profileData = {
        id: user.id,
        name: userData.name || userData.full_name || (user.email ? user.email.split('@')[0] : 'User'),
        email: user.email || '',
        role: 'Member' as Role, // Default to Member role for new profiles
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
        return {
          id: result.id,
          name: result.name,
          email: result.email,
          createdAt: result.created_at,
          role: result.role as Role || 'Member'
        };
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
  private static async createProfileViaAPI(user: User, profileData?: any): Promise<Profile | null> {
    try {
      console.log('Attempting profile creation via API fallback');
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;

      if (!token) {
        throw new Error('No authentication token available for API fallback');
      }

      // Prepare the data
      const userData = user.user_metadata || {};
      const payload = profileData || {
        id: user.id,
        name: userData.name || userData.full_name || (user.email ? user.email.split('@')[0] : 'User'),
        email: user.email || ''
      };

      // Call the API
      const response = await fetch('/api/auth/ensure-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
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
      return {
        id: result.profile.id,
        name: result.profile.name,
        email: result.profile.email,
        createdAt: result.profile.created_at,
        role: result.profile.role as Role || 'Member'
      };
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
}