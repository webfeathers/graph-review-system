// pages/api/auth/[...route].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { route } = req.query;
  
  // Handle different auth routes
  if (Array.isArray(route) && route.length > 0) {
    // Handle login
    if (route[0] === 'login' && req.method === 'POST') {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        return res.status(401).json({ message: error.message });
      }
      
      return res.status(200).json({
        message: 'Login successful',
        user: data.user,
        session: data.session,
      });
    }
    
    // Handle registration
    if (route[0] === 'register' && req.method === 'POST') {
      const { name, email, password } = req.body;
      
      if (!name || !email || !password) {
        return res.status(400).json({ message: 'Name, email, and password are required' });
      }
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });
      
      if (error) {
        return res.status(400).json({ message: error.message });
      }
      
      // Create profile in profiles table
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name,
            email,
          });
          
        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }
      
      return res.status(201).json({
        message: 'Registration successful',
        user: data.user,
        session: data.session,
      });
    }
    
    // Handle logout
    if (route[0] === 'logout' && req.method === 'POST') {
      // Get the session token from the request
      const { token } = req.body;
      
      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }
      
      const { error } = await supabase.auth.admin.signOut(token);
      
      if (error) {
        return res.status(500).json({ message: error.message });
      }
      
      return res.status(200).json({ message: 'Logout successful' });
    }
    
    // Handle session check
    if (route[0] === 'session' && req.method === 'GET') {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const token = authHeader.substring(7);
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      return res.status(200).json({ user: data.user });
    }
  }
  
  return res.status(404).json({ message: 'Route not found' });
}