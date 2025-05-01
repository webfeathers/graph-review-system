// pages/api/auth/session.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize, parse } from 'cookie';
import { Session } from '@supabase/supabase-js';

// Cookie options for secure session storage
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  path: '/'
};

// The name of the cookie
const SESSION_COOKIE_NAME = 'gr_session';

/**
 * API endpoint to securely store and retrieve the session in an HTTP-only cookie
 * This prevents JavaScript access to the session token, mitigating XSS attacks
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Handle POST request - Store session
  if (req.method === 'POST') {
    try {
      const { session } = req.body;
      
      if (!session) {
        return res.status(400).json({ success: false, message: 'Session data is required' });
      }
      
      // Only store minimal required session data (not the entire session object)
      const sessionData = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at
      };
      
      // Create a secure cookie with the session data
      const sessionCookie = serialize(
        SESSION_COOKIE_NAME,
        JSON.stringify(sessionData),
        COOKIE_OPTIONS
      );
      
      // Set the cookie in the response
      res.setHeader('Set-Cookie', sessionCookie);
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error storing session:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
  
  // Handle GET request - Retrieve session
  if (req.method === 'GET') {
    try {
      // Parse the cookies from the request
      const cookies = parse(req.headers.cookie || '');
      
      // Get the session cookie
      const sessionCookie = cookies[SESSION_COOKIE_NAME];
      
      if (!sessionCookie) {
        return res.status(404).json({ success: false, message: 'No session found' });
      }
      
      // Parse the session data
      const sessionData = JSON.parse(sessionCookie);
      
      return res.status(200).json({ success: true, session: sessionData });
    } catch (error) {
      console.error('Error retrieving session:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
  
  // Handle DELETE request - Clear session
  if (req.method === 'DELETE') {
    try {
      // Create an expired cookie to clear the session
      const clearedCookie = serialize(
        SESSION_COOKIE_NAME,
        '',
        {
          ...COOKIE_OPTIONS,
          maxAge: 0 // Expire immediately
        }
      );
      
      // Set the cleared cookie in the response
      res.setHeader('Set-Cookie', clearedCookie);
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error clearing session:', error);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
  
  // Handle other methods
  return res.status(405).json({ success: false, message: 'Method not allowed' });
}