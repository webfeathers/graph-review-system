// pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import { users } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Find user
  const user = users.find(user => user.email === email);

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Create token
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1d' }
  );

  // Set cookie
  const cookie = serialize('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86400,
    path: '/',
  });

  res.setHeader('Set-Cookie', cookie);
  
  return res.status(200).json({
    message: 'Login successful',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
}