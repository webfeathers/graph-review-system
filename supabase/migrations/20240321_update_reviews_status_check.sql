-- Drop the existing constraint
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_status_check;

-- Add the new constraint with 'Archived' included
ALTER TABLE reviews ADD CONSTRAINT reviews_status_check 
  CHECK (status IN ('Draft', 'Submitted', 'In Review', 'Needs Work', 'Approved', 'Archived')); 