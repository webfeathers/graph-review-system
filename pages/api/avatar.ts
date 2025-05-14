import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

type ResponseData = {
  avatarUrl: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ avatarUrl: '' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ avatarUrl: '' });
  }

  const emailHash = crypto
    .createHash('md5')
    .update(email.trim().toLowerCase())
    .digest('hex');

  const avatarUrl = `https://www.gravatar.com/avatar/${emailHash}?s=200&d=identicon`;
  
  res.status(200).json({ avatarUrl });
} 