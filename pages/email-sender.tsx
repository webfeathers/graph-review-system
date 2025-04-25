// pages/email-sender.tsx
import React, { useState } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import { Button } from '../components/Button';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { 
  Form, 
  TextInput, 
  TextArea,
  SubmitButton 
} from '../components/form/FormComponents';

const EmailSender: React.FC = () => {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset status
    setError(null);
    setSuccess(null);
    
    // Basic validation
    if (!to.trim()) {
      setError('Recipient email is required');
      return;
    }
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!message.trim()) {
      setError('Message is required');
      return;
    }
    
    try {
      setIsSending(true);
      
      // Call our API endpoint
      const response = await fetch('/api/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          html: message.replace(/\n/g, '<br>'), // Convert newlines to HTML breaks
          text: message // Plain text fallback
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email');
      }
      
      // Show success message
      setSuccess('Email sent successfully!');
      
      // Clear the form
      setTo('');
      setSubject('');
      setMessage('');
    } catch (err) {
      console.error('Error sending email:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Email Sender</title>
      </Head>
      
      <div className="max-w-2xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Send Email</h1>
        
        {error && (
          <ErrorDisplay
            error={error}
            onDismiss={() => setError(null)}
            variant="error"
            className="mb-6"
          />
        )}
        
        {success && (
          <div className="bg-green-100 text-green-700 p-4 rounded-md mb-6 flex justify-between items-center">
            <p>{success}</p>
            <button 
              onClick={() => setSuccess(null)}
              className="text-green-700 hover:text-green-900"
            >
              ×
            </button>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <label htmlFor="to" className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Email<span className="text-red-600 ml-1">*</span>
            </label>
            <input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="recipient@example.com"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              Subject<span className="text-red-600 ml-1">*</span>
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Email subject"
              required
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Message<span className="text-red-600 ml-1">*</span>
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your email message..."
              rows={8}
              required
            />
          </div>
          
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSending}
              disabled={isSending}
            >
              {isSending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default EmailSender;