// Inside your handleSubmit function:

// If there's an image, upload it directly to Supabase Storage
let uploadedImageUrl = undefined;

if (graphImage) {
  try {
    // Create a filename and directly attempt the upload
    const filename = `${Date.now()}-${graphImage.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    
    // Attempt the upload without any pre-checks
    const { data, error } = await supabase.storage
      .from('graph-images')
      .upload(filename, graphImage);
    
    if (error) {
      console.error('Upload error:', error);
      throw error;
    }
    
    // Get the URL
    const { data: urlData } = supabase.storage
      .from('graph-images')
      .getPublicUrl(data.path);
    
    uploadedImageUrl = urlData.publicUrl;
  } catch (err) {
    console.error('Image upload failed:', err);
    setError(err.message || 'Failed to upload image');
    setIsSubmitting(false);
    return;
  }
}

// Now proceed with creating the review
await createReview({
  title,
  description,
  graphImageUrl: uploadedImageUrl,
  status: 'Submitted',
  userId: user.id,
});