// lib/profileService.ts
import { supabase } from './supabase';
import { User, SupabaseClient } from '@supabase/supabase-js';
import { Profile, Role } from '../types/supabase';
import { POINTS_PER_REVIEW, POINTS_PER_COMMENT, POINTS_PER_REVIEW_APPROVAL, POINTS_PER_TASK_COMPLETION, BADGE_THRESHOLDS } from '../constants';

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
  static clearProfileFromCache(userId: string): void {
    this.profileCache.delete(userId);
  }
  
  /**
   * Creates or updates a user profile, ensuring all required fields are present
   * 
   * @param user The authenticated user object
   * @param additionalData Optional additional data to include in the profile
   * @param supabaseClient Optional Supabase client to use for the request
   * @returns The profile object, or null if creation failed
   */
  static async ensureProfile(
    user: User | { id: string }, 
    additionalData: any = {},
    supabaseClient?: SupabaseClient
  ): Promise<Profile | null> {
    if (!user || !user.id) {
      console.error('Cannot ensure profile: Invalid user provided');
      return null;
    }

    // Use provided client or fall back to global client
    const client = supabaseClient || supabase;

    try {
      // Check cache first
      const cachedProfile = this.getProfileFromCache(user.id);
      if (cachedProfile) {
        return cachedProfile;
      }
      
      // Step 1: Check if profile already exists
      const { data: existingProfile, error: checkError } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // If profile exists and has all required fields, return it
      if (!checkError && existingProfile) {
        const baseProfile = {
          id: existingProfile.id,
          name: existingProfile.name || (additionalData.email ? additionalData.email.split('@')[0] : 'User'),
          email: existingProfile.email || additionalData.email || '',
          createdAt: existingProfile.created_at,
          role: existingProfile.role as Role || 'Member',
          avatarUrl: existingProfile.avatar_url
        };

        // If profile exists but is missing required fields, update it
        if (!existingProfile.name || !existingProfile.role) {
          const { data: updatedProfile, error: updateError } = await client
            .from('profiles')
            .update({
              name: baseProfile.name,
              role: baseProfile.role,
              email: baseProfile.email,
              avatar_url: baseProfile.avatarUrl
            })
            .eq('id', user.id)
            .select()
            .single();

          if (updateError) {
            throw new Error(`Failed to update incomplete profile: ${updateError.message}`);
          } else if (updatedProfile) {
            baseProfile.role = updatedProfile.role as Role || 'Member';
          }
        }

        // Enrich with counts, points, and badges
        const [
          { count: reviewCount },
          { count: commentCount },
          { count: approvedReviewCount },
          { count: completedTaskCount },
          { data: helpfulVotes },
          { data: firstComments },
          { data: uniqueReviews },
          { data: userCreatedAt }
        ] = await Promise.all([
          client
            .from('reviews')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          client
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          client
            .from('reviews')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'Approved'),
          client
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('assigned_to', user.id)
            .eq('status', 'completed'),
          client
            .from('comment_votes')
            .select('comment_id')
            .eq('user_id', user.id)
            .eq('vote_type', 'up'),
          client
            .from('comments')
            .select('review_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }),
          client
            .from('reviews')
            .select('id')
            .eq('user_id', user.id),
          client
            .from('profiles')
            .select('created_at')
            .eq('id', user.id)
            .single()
        ]);

        const reviewsCountValue = reviewCount || 0;
        const commentsCountValue = commentCount || 0;
        const approvedReviewsCountValue = approvedReviewCount || 0;
        const completedTasksCountValue = completedTaskCount || 0;
        const helpfulVotesCount = helpfulVotes?.length || 0;
        const firstCommentsCount = firstComments?.length || 0;
        const uniqueReviewsCount = uniqueReviews?.length || 0;
        const monthsActive = userCreatedAt ? 
          Math.floor((Date.now() - new Date(userCreatedAt.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000)) : 0;
        
        const points = (reviewsCountValue * POINTS_PER_REVIEW) + 
                      (commentsCountValue * POINTS_PER_COMMENT) +
                      (approvedReviewsCountValue * POINTS_PER_REVIEW_APPROVAL) +
                      (completedTasksCountValue * POINTS_PER_TASK_COMPLETION);

        // Calculate badges based on different metrics
        const badges = BADGE_THRESHOLDS
          .filter(({ type, threshold, category }) => {
            switch (category) {
              case 'points':
                return points >= threshold;
              case 'reviews':
                switch (type) {
                  case 'Review Master':
                    return reviewsCountValue >= threshold;
                  case 'Quality Reviewer':
                    return approvedReviewsCountValue >= threshold;
                  case 'Helpful Reviewer':
                    return helpfulVotesCount >= threshold;
                  default:
                    return false;
                }
              case 'comments':
                switch (type) {
                  case 'Engaged Commenter':
                    return commentsCountValue >= threshold;
                  case 'Insightful Commenter':
                    return helpfulVotesCount >= threshold;
                  default:
                    return false;
                }
              case 'special':
                switch (type) {
                  case 'Early Adopter':
                    return monthsActive >= 1; // Joined in first month
                  case 'Team Player':
                    return uniqueReviewsCount >= threshold;
                  case 'Consistent Contributor':
                    return monthsActive >= threshold;
                  case 'Ice Breaker':
                    return firstCommentsCount >= threshold;
                  default:
                    return false;
                }
              default:
                return false;
            }
          })
          .map(({ type }) => type);

        const profile: Profile = {
          ...baseProfile,
          reviewCount: reviewsCountValue,
          commentCount: commentsCountValue,
          points,
          badges
        };

        this.addProfileToCache(profile);
        return profile;
      }

      // Step 2: Prepare data for profile creation/update
      // Handle both full User objects and simple id objects
      const userData = (user as User).user_metadata || {};
      const email = (user as User).email || additionalData.email || '';
      
      // Get Google avatar URL if available
      const avatarUrl = userData.avatar_url || userData.picture || null;
      
      const profileData = {
        id: user.id,
        name: additionalData.name || userData.name || userData.full_name || 
              (email ? email.split('@')[0] : 'User'),
        email: email,
        role: additionalData.role || 'Member' as Role,
        created_at: new Date().toISOString(),
        avatar_url: avatarUrl
      };

      // Step 3: Update or create profile
      let result;

      if (!checkError && existingProfile) {
        // Update existing profile
        console.log('Updating existing profile for user:', user.id);
        const { data: updatedProfile, error: updateError } = await client
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
        const { data: newProfile, error: createError } = await client
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
        const baseProfile = {
          id: result.id,
          name: result.name,
          email: result.email,
          createdAt: result.created_at,
          role: result.role as Role || 'Member',
          avatarUrl: result.avatar_url
        };

        // Enrich with counts, points, and badges
        const [
          { count: reviewCount },
          { count: commentCount },
          { count: approvedReviewCount },
          { count: completedTaskCount },
          { data: helpfulVotes },
          { data: firstComments },
          { data: uniqueReviews },
          { data: userCreatedAt }
        ] = await Promise.all([
          client
            .from('reviews')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          client
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          client
            .from('reviews')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('status', 'Approved'),
          client
            .from('tasks')
            .select('id', { count: 'exact', head: true })
            .eq('assigned_to', user.id)
            .eq('status', 'completed'),
          client
            .from('comment_votes')
            .select('comment_id')
            .eq('user_id', user.id)
            .eq('vote_type', 'up'),
          client
            .from('comments')
            .select('review_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true }),
          client
            .from('reviews')
            .select('id')
            .eq('user_id', user.id),
          client
            .from('profiles')
            .select('created_at')
            .eq('id', user.id)
            .single()
        ]);

        const reviewsCountValue = reviewCount || 0;
        const commentsCountValue = commentCount || 0;
        const approvedReviewsCountValue = approvedReviewCount || 0;
        const completedTasksCountValue = completedTaskCount || 0;
        const helpfulVotesCount = helpfulVotes?.length || 0;
        const firstCommentsCount = firstComments?.length || 0;
        const uniqueReviewsCount = uniqueReviews?.length || 0;
        const monthsActive = userCreatedAt ? 
          Math.floor((Date.now() - new Date(userCreatedAt.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000)) : 0;
        
        const points = (reviewsCountValue * POINTS_PER_REVIEW) + 
                      (commentsCountValue * POINTS_PER_COMMENT) +
                      (approvedReviewsCountValue * POINTS_PER_REVIEW_APPROVAL) +
                      (completedTasksCountValue * POINTS_PER_TASK_COMPLETION);

        // Calculate badges based on different metrics
        const badges = BADGE_THRESHOLDS
          .filter(({ type, threshold, category }) => {
            switch (category) {
              case 'points':
                return points >= threshold;
              case 'reviews':
                switch (type) {
                  case 'Review Master':
                    return reviewsCountValue >= threshold;
                  case 'Quality Reviewer':
                    return approvedReviewsCountValue >= threshold;
                  case 'Helpful Reviewer':
                    return helpfulVotesCount >= threshold;
                  default:
                    return false;
                }
              case 'comments':
                switch (type) {
                  case 'Engaged Commenter':
                    return commentsCountValue >= threshold;
                  case 'Insightful Commenter':
                    return helpfulVotesCount >= threshold;
                  default:
                    return false;
                }
              case 'special':
                switch (type) {
                  case 'Early Adopter':
                    return monthsActive >= 1; // Joined in first month
                  case 'Team Player':
                    return uniqueReviewsCount >= threshold;
                  case 'Consistent Contributor':
                    return monthsActive >= threshold;
                  case 'Ice Breaker':
                    return firstCommentsCount >= threshold;
                  default:
                    return false;
                }
              default:
                return false;
            }
          })
          .map(({ type }) => type);

        const profile: Profile = {
          ...baseProfile,
          reviewCount: reviewsCountValue,
          commentCount: commentsCountValue,
          points,
          badges
        };

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
        console.log('No session token found, redirecting to login...');
        // Redirect to login page
        window.location.href = '/login';
        return null;
      }

      // Get user data from Supabase auth
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !authUser) {
        console.log('Failed to get user data, redirecting to login...');
        // Redirect to login page
        window.location.href = '/login';
        return null;
      }

      // Prepare the data
      const userData = authUser.user_metadata || {};
      const email = authUser.email || '';
      
      // Split the name into first and last name
      let firstName = '';
      let lastName = '';
      
      // Try to get name from various sources, prioritizing Google account data
      const fullName = userData.full_name || 
                      userData.name || 
                      profileData?.name || 
                      (email ? email.split('@')[0] : 'User');
      
      // Split name and ensure we have both first and last name
      const nameParts = fullName.split(' ');
      if (nameParts.length > 1) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      } else {
        // If only one name part, use it as first name and generate a last name
        firstName = nameParts[0] || 'User';
        lastName = 'User'; // Default last name if none provided
      }

      // Ensure we have all required fields
      if (!firstName || !lastName || !email) {
        console.error('Missing required fields:', { firstName, lastName, email });
        throw new Error('Missing required fields for profile creation');
      }

      // Check if user is an admin based on email domain
      const isAdmin = email.endsWith('@leandata.com');

      console.log('User data:', {
        email,
        firstName,
        lastName,
        userData,
        profileData,
        isAdmin
      });

      const payload = {
        firstName,
        lastName,
        email,
        role: isAdmin ? 'Admin' : (profileData?.role || userData.role || 'Member')
      };

      console.log('Sending profile data to API:', payload);

      // Call the API
      const response = await fetch('/api/auth/ensure-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          console.log('Unauthorized, redirecting to login...');
          // Redirect to login page
          window.location.href = '/login';
          return null;
        }
        console.error('API response error:', responseData);
        throw new Error(`API request failed: ${responseData.message || response.statusText}`);
      }

      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to create profile via API');
      }

      const profile = {
        id: responseData.profile.id,
        name: responseData.profile.name,
        email: responseData.profile.email,
        createdAt: responseData.profile.created_at,
        role: responseData.profile.role as Role || 'Member'
      };

      // Add to cache
      this.addProfileToCache(profile);

      // Don't redirect here - let the AuthProvider handle it
      return profile;
    } catch (error) {
      console.error('Error in createProfileViaAPI:', error);
      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        console.log('Authentication error, redirecting to login...');
        // Redirect to login page
        window.location.href = '/login';
      }
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

  static async forceRefreshProfile(userId: string): Promise<Profile | null> {
    console.log('Forcing profile refresh for user:', userId);
    this.clearProfileFromCache(userId);
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === userId) {
      return await this.ensureProfile(user);
    }
    return null;
  }
}