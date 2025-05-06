import { supabase } from './supabase';
import type { ReviewWithProfile, CommentWithProfile, Profile } from '../types/supabase';

// Reviews
export const getReviews = async (userId?: string) => {
  let query = supabase
    .from('reviews')
    .select(`
      *,
      user:profiles!fk_reviews_user(id, name, email, created_at, role),
      projectLead:profiles!fk_project_lead(id, name, email, created_at, role)
    `)
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as ReviewWithProfile[];
};

export const getReviewById = async (id: string) => {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      user:profiles!fk_reviews_user(id, name, email, created_at, role),
      projectLead:profiles!fk_project_lead(id, name, email, created_at, role),
      comments:comments!inner(
        id,
        content,
        created_at,
        user_id,
        user:profiles!fk_comments_user(id, name, email, created_at, role)
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as ReviewWithProfile;
};

export const updateReviewStatus = async (id: string, status: string) => {
  const { data, error } = await supabase
    .from('reviews')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateProjectLead = async (reviewId: string, newLeadId: string, role: string) => {
  const { data, error } = await supabase
    .from('reviews')
    .update({ project_lead_id: newLeadId })
    .eq('id', reviewId)
    .select(`
      *,
      user:profiles!reviews_user_id_fkey(id, name, email, created_at, role),
      projectLead:profiles!reviews_project_lead_id_fkey(id, name, email, created_at, role)
    `)
    .single();

  if (error) throw error;
  return data as ReviewWithProfile;
};

// Comments
export const getCommentsByReviewId = async (reviewId: string) => {
  const { data, error } = await supabase
    .from('comments')
    .select(`
      *,
      user:profiles!fk_comments_user(id, name, email, created_at, role)
    `)
    .eq('review_id', reviewId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as CommentWithProfile[];
};

export const addComment = async (reviewId: string, content: string, userId: string) => {
  const { data, error } = await supabase
    .from('comments')
    .insert([
      {
        review_id: reviewId,
        content,
        user_id: userId
      }
    ])
    .select(`
      *,
      user:profiles!fk_comments_user(id, name, email, created_at, role)
    `)
    .single();

  if (error) throw error;
  return data as CommentWithProfile;
};

// Profiles
export const getProfiles = async () => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name');

  if (error) throw error;
  return data as Profile[];
};

export const getProfileById = async (id: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as Profile;
}; 