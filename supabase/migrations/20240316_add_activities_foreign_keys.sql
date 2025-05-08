-- Add foreign key constraints to activities table
ALTER TABLE activities
ADD CONSTRAINT fk_activities_user
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

ALTER TABLE activities
ADD CONSTRAINT fk_activities_review
FOREIGN KEY (review_id)
REFERENCES reviews(id)
ON DELETE CASCADE;

-- Add index for faster lookups
CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_review_id ON activities(review_id);
CREATE INDEX idx_activities_created_at ON activities(created_at DESC); 