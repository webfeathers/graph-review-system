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
  graph_image_url?: string;
  status: 'Submitted' | 'In Review' | 'Needs Work' | 'Approved';
  user_id: string;
  created_at: string;
  updated_at: string;
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