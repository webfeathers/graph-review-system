// pages/api/storage-test.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get Supabase credentials from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  // Capture environment info
  const envInfo = {
    nodeEnv: process.env.NODE_ENV,
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
    hasAnonKey: !!supabaseAnonKey,
  };
  
  // Test results
  let clientResults = { success: false, error: null, buckets: [] };
  let serviceResults = { success: false, error: null, buckets: [] };
  
  try {
    // 1. First test with the existing client (anon key)
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      clientResults = {
        success: !error,
        error,
        buckets: buckets || []
      };
    } catch (error) {
      clientResults.error = error;
    }
    
    // 2. Try with service role key if available
    if (supabaseServiceKey) {
      try {
        const adminClient = createClient(
          supabaseUrl || '',
          supabaseServiceKey
        );
        
        const { data: buckets, error } = await adminClient.storage.listBuckets();
        
        serviceResults = {
          success: !error,
          error,
          buckets: buckets || []
        };
      } catch (error) {
        serviceResults.error = error;
      }
    }
    
    // Return all test results
    return res.status(200).json({
      environment: envInfo,
      clientTest: {
        ...clientResults,
        hasGraphImagesBucket: clientResults.buckets.some(b => b.name === 'graph-images')
      },
      serviceTest: {
        ...serviceResults,
        hasGraphImagesBucket: serviceResults.buckets.some(b => b.name === 'graph-images')
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Unexpected error testing storage',
      environment: envInfo
    });
  }
}