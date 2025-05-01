// models/User.ts
// This file is kept for backward compatibility
// In the future, import from '../types' instead

import type { Profile } from '../types/supabase';
// Re-export Profile as User for backwards compatibility
export type { Profile as User };

/*
 * DEPRECATION NOTICE:
 * This file is deprecated and will be removed in a future update.
 * Please update your imports to use '../types' instead:
 * 
 * import type { Profile as User } from '../types';
 */