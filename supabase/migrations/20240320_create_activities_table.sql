-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('review', 'comment', 'project', 'user')),
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    link TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
    project_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS activities_user_id_idx ON activities(user_id);
CREATE INDEX IF NOT EXISTS activities_review_id_idx ON activities(review_id);
CREATE INDEX IF NOT EXISTS activities_created_at_idx ON activities(created_at DESC);

-- Add RLS policies
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Allow users to read all activities
CREATE POLICY "Users can view all activities"
    ON activities FOR SELECT
    USING (true);

-- Allow users to create activities for their own actions
CREATE POLICY "Users can create their own activities"
    ON activities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_activities_updated_at
    BEFORE UPDATE ON activities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 