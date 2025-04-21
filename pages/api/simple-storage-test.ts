// pages/api/simple-storage-test.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  // Create response object
  const response = {
    url: supabaseUrl,
    hasAnonKey: !!supabaseAnonKey,
    hasServiceKey: !!supabaseServiceKey,
    anonKeyResult: null as any,
    serviceKeyResult: null as any
  };
  
  // Test with anon key
  try {
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: anonData, error: anonError } = await anonClient.storage.listBuckets();
    
    response.anonKeyResult = {
      success: !anonError,
      error: anonError ? anonError.message : null,
      buckets: anonData?.map(b => b.name) || [],
      hasGraphImagesBucket: anonData?.some(b => b.name === 'graph-images') || false
    };
  } catch (error: any) {
    response.anonKeyResult = {
      success: false,
      error: error.message,
      buckets: [],
      hasGraphImagesBucket: false
    };
  }
  
  // Test with service key if available
  if (supabaseServiceKey) {
    try {
      const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
      const { data: serviceData, error: serviceError } = await serviceClient.storage.listBuckets();
      
      response.serviceKeyResult = {
        success: !serviceError,
        error: serviceError ? serviceError.message : null,
        buckets: serviceData?.map(b => b.name) || [],
        hasGraphImagesBucket: serviceData?.some(b => b.name === 'graph-images') || false
      };
    } catch (error: any) {
      response.serviceKeyResult = {
        success: false,
        error: error.message,
        buckets: [],
        hasGraphImagesBucket: false
      };
    }
  }
  
  // Send response
  res.status(200).json(response);
}