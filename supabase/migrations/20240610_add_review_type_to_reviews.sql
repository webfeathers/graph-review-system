-- Add review_type column to reviews table
ALTER TABLE reviews
ADD COLUMN review_type TEXT NOT NULL DEFAULT 'customer';

-- Optionally, add an index for review_type
CREATE INDEX IF NOT EXISTS reviews_review_type_idx ON reviews(review_type); 