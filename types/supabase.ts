// types/supabase.ts
export type Profile = {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export type Review = {
  id: string;
  title: string;
  description: string;
  graphImageUrl?: string; // Changed from graph_image_url
  status: 'Submitted' | 'In Review' | 'Needs Work' | 'Approved';
  userId: string; // Changed from user_id
  createdAt: string; // Changed from created_at
  updatedAt: string; // Changed from updated_at
}

export type Comment = {
  id: string;
  content: string;
  review_id: string;
  user_id: string;
  created_at: string;
}

export type ReviewWithUser = Review & {
  user: Profile;
}

export type CommentWithUser = Comment & {
  user: Profile;
}