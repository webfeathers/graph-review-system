-- Add parent_id column to comments table
ALTER TABLE comments
ADD COLUMN parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- Create index for faster queries on parent_id
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON comments(parent_id);

-- Update RLS policies to allow reading/writing threaded comments
-- (No changes needed as existing policies already allow all authenticated users to read/write comments)

-- Add check constraint to prevent circular references
ALTER TABLE comments
ADD CONSTRAINT no_circular_references
CHECK (id != parent_id); 