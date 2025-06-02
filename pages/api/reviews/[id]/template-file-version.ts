import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../../lib/supabase';
import { withAuth } from '../../../../lib/apiHelpers';
import { IncomingForm, Files, Fields } from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const formidableOptions = {
  maxFileSize: 2 * 1024 * 1024, // 2MB
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const reviewId = req.query.id as string;
  if (!reviewId) {
    return res.status(400).json({ error: 'Missing review ID' });
  }

  // Parse multipart form
  const form = new IncomingForm(formidableOptions);
  form.parse(req, async (err: Error | null, fields: Fields, files: Files) => {
    if (err) {
      return res.status(400).json({ error: 'File upload error: ' + err.message });
    }
    let file = files.file as any;
    if (Array.isArray(file)) file = file[0];
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (file.mimetype !== 'text/plain') {
      return res.status(400).json({ error: 'Only .txt files are allowed' });
    }
    // Upload to Supabase Storage
    try {
      const fileData = fs.readFileSync(file.filepath);
      const sanitizedFileName = path.basename(file.originalFilename || file.newFilename).replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `templates/${reviewId}/${Date.now()}_${sanitizedFileName}`;
      const { data, error } = await supabase.storage.from('template-files').upload(storagePath, fileData);
      if (error) {
        return res.status(500).json({ error: 'Failed to upload file: ' + error.message });
      }
      const { data: publicUrlData } = supabase.storage.from('template-files').getPublicUrl(storagePath);
      const fileUrl = publicUrlData?.publicUrl || '';
      // Insert into template_file_versions
      const { data: version, error: insertError } = await supabase
        .from('template_file_versions')
        .insert({
          review_id: reviewId,
          file_url: fileUrl,
          uploaded_by: userId
        })
        .select('*')
        .single();
      if (insertError) {
        return res.status(500).json({ error: 'Failed to record file version: ' + insertError.message });
      }

      // Log activity for file upload
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          type: 'template_file_uploaded',
          review_id: reviewId,
          user_id: userId,
          metadata: { file_url: fileUrl },
          created_at: new Date().toISOString()
        });
      if (activityError) {
        console.error('Error logging template_file_uploaded activity:', activityError);
      }

      // Fetch latest review data (including new file version)
      const { data: reviewData, error: reviewFetchError } = await supabase
        .from('reviews')
        .select(`
          *,
          template_file_versions:template_file_versions(*, uploader:profiles!uploaded_by(id, name, email))
        `)
        .eq('id', reviewId)
        .single();
      if (reviewFetchError) {
        return res.status(200).json({ success: true, version });
      }

      return res.status(200).json({ success: true, version, review: reviewData });
    } catch (e: any) {
      return res.status(500).json({ error: 'Unexpected error: ' + (e.message || e) });
    }
  });
};

export default withAuth(handler); 