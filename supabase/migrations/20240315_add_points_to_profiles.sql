-- Add points column to profiles table
ALTER TABLE profiles 
ADD COLUMN points INTEGER NOT NULL DEFAULT 0;

-- Add a check constraint to ensure points are non-negative
ALTER TABLE profiles
ADD CONSTRAINT points_non_negative CHECK (points >= 0); 