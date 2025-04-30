// pages/api/kantata/validate-projects.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../lib/apiHelpers';
import { supabase } from '../../../lib/supabase';
import { EmailService } from '../../../lib/emailService';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  // Only allow POST requests (for manual triggering) or GET (for scheduled runs)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Get the Kantata API token
    const KANTATA_API_TOKEN = process.env.NEXT_PUBLIC_KANTATA_API_TOKEN;
    
    if (!KANTATA_API_TOKEN) {
      return res.status(500).json({
        success: false,
        message: 'Kantata API token not configured'
      });
    }
    
    // Get all reviews that have Kantata project IDs
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('id, title, status, kantata_project_id, user_id')
      .not('kantata_project_id', 'is', null);
      
    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      return res.status(500).json({
        success: false,
        message: 'Error fetching reviews',
        error: reviewsError.message
      });
    }
    
    if (!reviews || reviews.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No reviews with Kantata project IDs found',
        validationResults: []
      });
    }
    
    console.log(`Found ${reviews.length} reviews with Kantata project IDs`);
    
    // Process each review
    const validationResults = await Promise.all(
      reviews.map(async (review) => {
        try {
          // Get the project status from Kantata
          console.log(`Checking Kantata project ${review.kantata_project_id} for review ${review.id}`);
          
          const response = await fetch(`https://api.mavenlink.com/api/v1/workspaces/${review.kantata_project_id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${KANTATA_API_TOKEN}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (!response.ok) {
            console.error(`Error fetching Kantata project ${review.kantata_project_id}:`, response.status);
            return {
              reviewId: review.id,
              reviewTitle: review.title