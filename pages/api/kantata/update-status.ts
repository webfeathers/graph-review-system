// pages/api/kantata/update-status.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '../../../lib/apiHelpers';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Get the kantataProjectId and status from the request body
    const { kantataProjectId, status } = req.body;
    
    // Log request details for debugging
    console.log('Update status request:', {
      kantataProjectId,
      status,
      body: req.body
    });
    
    if (!kantataProjectId || !status) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: kantataProjectId and status'
      });
    }
    
    // Map the Graph Review status to a Kantata status
    const kantataStatus = status === 'Approved' ? 'Approved' : 'In Progress';
    
    // Use environment variable or hardcoded token
    const KANTATA_API_TOKEN = process.env.NEXT_PUBLIC_KANTATA_API_TOKEN || 
                            "07c8e70750fee404afa7c4c5c8ff72cb31e5b215e993357dbc7c8cbbde60dbcc";
    
    // Use environment variable for field ID
    const fieldId = process.env.NEXT_PUBLIC_KANTATA_STATUS_FIELD_ID;
    
    console.log('Using Kantata field ID:', fieldId);
    
    if (!fieldId) {
      return res.status(400).json({
        success: false,
        message: 'Missing custom field ID in environment variables'
      });
    }
    
    // This is the key change - first create the custom field value
    // Try to create a new custom field value first
    console.log('Creating custom field value...');
    
    const createPayload = {
      custom_field_value: {
        custom_field_id: fieldId,
        subject_id: kantataProjectId,
        subject_type: "workspace",
        value: kantataStatus
      }
    };
    
    // Make API request to create the custom field value
    const createResponse = await fetch('https://api.mavenlink.com/api/v1/custom_field_values', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KANTATA_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(createPayload)
    });
    
    console.log('Create response status:', createResponse.status);
    
    // If creation wasn't successful, try updating instead
    if (!createResponse.ok) {
      console.log('Creation failed, trying to update...');
      
      // First, get the custom field value ID
      const getResponse = await fetch(`https://api.mavenlink.com/api/v1/custom_field_values?custom_field_id=${fieldId}&subject_id=${kantataProjectId}&subject_type=workspace`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${KANTATA_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!getResponse.ok) {
        const errorText = await getResponse.text();
        console.error('Error getting custom field value:', errorText);
        
        return res.status(getResponse.status).json({
          success: false,
          message: 'Failed to find existing custom field value',
          details: errorText
        });
      }
      
      const getResponseData = await getResponse.json();
      console.log('Get custom field values response:', getResponseData);
      
      // Check if we found any existing values
      if (!getResponseData.results || getResponseData.results.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No existing custom field value found to update'
        });
      }
      
      /