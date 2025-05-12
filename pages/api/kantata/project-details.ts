import type { NextApiRequest, NextApiResponse } from 'next';
import { withAdminAuth } from '../../../lib/apiHelpers';

async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { projectId } = req.query;

  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ message: 'Project ID is required' });
  }

  try {
    const kantataApiToken = process.env.KANTATA_API_TOKEN;
    if (!kantataApiToken) {
      return res.status(500).json({ message: 'Kantata API token not configured' });
    }

    // Fetch project details from Kantata
    const url = `https://api.mavenlink.com/api/v1/workspaces/${projectId}?include=lead,creator,participants`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${kantataApiToken}`, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.error(`Kantata API error: ${response.status} for URL ${url}`);
      throw new Error(`Kantata API error: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Error in project-details API:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'An unexpected error occurred'
    });
  }
}

export default withAdminAuth(handler); 