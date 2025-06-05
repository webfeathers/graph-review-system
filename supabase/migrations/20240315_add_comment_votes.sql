-- Create enum for vote types
CREATE TYPE vote_type AS ENUM ('up', 'down');

-- Create comment_votes table
CREATE TABLE comment_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vote_type vote_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- Add foreign key to profiles table
ALTER TABLE comment_votes
ADD CONSTRAINT fk_comment_votes_user
FOREIGN KEY (user_id)
REFERENCES profiles(id)
ON DELETE CASCADE;

-- Add RLS policies
ALTER TABLE comment_votes ENABLE ROW LEVEL SECURITY;

-- Allow users to view all votes
CREATE POLICY "Users can view all votes"
    ON comment_votes FOR SELECT
    USING (true);

-- Allow authenticated users to insert their own votes
CREATE POLICY "Users can insert their own votes"
    ON comment_votes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own votes
CREATE POLICY "Users can update their own votes"
    ON comment_votes FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own votes
CREATE POLICY "Users can delete their own votes"
    ON comment_votes FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update points when a vote is added/updated/deleted
CREATE OR REPLACE FUNCTION update_points_on_vote()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a DELETE operation
    IF (TG_OP = 'DELETE') THEN
        -- Remove points based on the deleted vote
        UPDATE profiles
        SET points = points - (CASE 
            WHEN OLD.vote_type = 'up' THEN 1
            WHEN OLD.vote_type = 'down' THEN -1
        END)
        WHERE id = (
            SELECT user_id 
            FROM comments 
            WHERE id = OLD.comment_id
        );
        RETURN OLD;
    END IF;

    -- If this is an UPDATE operation
    IF (TG_OP = 'UPDATE') THEN
        -- Remove points from old vote
        UPDATE profiles
        SET points = points - (CASE 
            WHEN OLD.vote_type = 'up' THEN 1
            WHEN OLD.vote_type = 'down' THEN -1
        END)
        WHERE id = (
            SELECT user_id 
            FROM comments 
            WHERE id = OLD.comment_id
        );
        
        -- Add points from new vote
        UPDATE profiles
        SET points = points + (CASE 
            WHEN NEW.vote_type = 'up' THEN 1
            WHEN NEW.vote_type = 'down' THEN -1
        END)
        WHERE id = (
            SELECT user_id 
            FROM comments 
            WHERE id = NEW.comment_id
        );
        RETURN NEW;
    END IF;

    -- If this is an INSERT operation
    IF (TG_OP = 'INSERT') THEN
        -- Add points based on the new vote
        UPDATE profiles
        SET points = points + (CASE 
            WHEN NEW.vote_type = 'up' THEN 1
            WHEN NEW.vote_type = 'down' THEN -1
        END)
        WHERE id = (
            SELECT user_id 
            FROM comments 
            WHERE id = NEW.comment_id
        );
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update points
CREATE TRIGGER on_vote_change
    AFTER INSERT OR UPDATE OR DELETE ON comment_votes
    FOR EACH ROW
    EXECUTE FUNCTION update_points_on_vote(); 