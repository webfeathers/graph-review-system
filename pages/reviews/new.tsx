// pages/reviews/new.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../components/AuthProvider';
import { createReview } from '../../lib/supabaseUtils';
import { supabase } from '../../lib/supabase';

const NewReview: NextPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [graphImage, setGraphImage] = useState<File | null>(null);
  const [graphImageUrl, setGraphImageUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (loading) return;
    
    if (!user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setGraphImage(file);
      setGraphImageUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required');
      return;
    }

    if (!user) {
      setError('You must be logged in to submit a review');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      let uploadedImageUrl = undefined;
      
      // If there's an image, upload it to Supabase Storage
      if (graphImage) {
        const fileName = `${Date.now()}_${graphImage.name}`;
        const { data, error } = await supabase.storage
          .from('graph-images')
          .upload(fileName, graphImage);
          
        if (error) throw error;
        
        // Get the public URL
        const { data: { publicUrl } } = supabase.storage
          .from('graph-images')
          .getPublicUrl(fileName);
          
        uploadedImageUrl = publicUrl;
      }

      // Use camelCase for frontend and our createReview function will convert it to snake_case
      await createReview({
        title,
        description,
        graphImageUrl: uploadedImageUrl,
        status: 'Submitted',
        userId: user.id,
      });

      // Redirect to the reviews page on success
      router.push('/reviews');
    } catch (err: any) {
      console.error('Error creating review:', err);
      setError(err.message || 'Failed to create review');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Submit a New Graph Review</h1>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 mb-2" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded h-32"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2" htmlFor="graphImage">
              Graph Image (Optional)
            </label>
            <input
              id="graphImage"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="w-full"
            />
            {graphImageUrl && (
              <div className="mt-2">
                <img
                  src={graphImageUrl}
                  alt="Graph preview"
                  className="w-full max-h-60 object-contain"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-gray-600 hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-500 text-white py-2 px-6 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default NewReview;