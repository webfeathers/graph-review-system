// lib/profileService.ts - Add this new method

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

// Optionally, consider increasing the cache TTL for better performance
// private static CACHE_TTL = 15 * 60 * 1000; // 15 minutes