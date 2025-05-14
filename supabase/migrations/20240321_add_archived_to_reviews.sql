-- Add archived column to reviews table
ALTER TABLE reviews
ADD COLUMN archived BOOLEAN DEFAULT FALSE;

-- Create index for faster queries on archived status
CREATE INDEX IF NOT EXISTS reviews_archived_idx ON reviews(archived);

-- Update existing reviews to have archived = false
UPDATE reviews SET archived = false WHERE archived IS NULL; 