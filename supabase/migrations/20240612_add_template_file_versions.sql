-- Migration: Add template_file_versions table for versioned template uploads
CREATE TABLE IF NOT EXISTS template_file_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_template_file_versions_review_id ON template_file_versions(review_id); 