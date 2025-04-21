// pages/storage-test.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useAuth } from '../components/AuthProvider';

const StorageTestPage = () => {
  const { user, loading } = useAuth();
  const [testResults, setTestResults] = useState<any>(null);
  const [buckets, setBuckets] = useState<any[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Function to test bucket listing
  const testBucketListing = async () => {
    setTestStatus('loading');
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('Error listing buckets:', error);
        setErrorMessage(`Error listing buckets: ${error.message}`);
        setTestStatus('error');
        return;
      }
      
      setBuckets(data || []);
      setTestStatus('success');
      
      // Log raw response for debugging
      console.log('Raw bucket response:', data);
      
      return data;
    } catch (err: any) {
      console.error('Exception during bucket listing:', err);
      setErrorMessage(`Exception: ${err.message}`);
      setTestStatus('error');
    }
  };

  // Function to test file listing in a specific bucket
  const testBucketFiles = async (bucketName: string) => {
    try {
      setTestStatus('loading');
      const { data, error } = await supabase.storage
        .from(bucketName)
        .list();
        
      if (error) {
        console.error(`Error listing files in bucket ${bucketName}:`, error);
        setErrorMessage(`Error listing files: ${error.message}`);
        setTestStatus('error');
        return;
      }
      
      setFiles(data || []);
      setTestStatus('success');
      
      // Log raw response for debugging
      console.log(`Raw files response for ${bucketName}:`, data);
      
      return data;
    } catch (err: any) {
      console.error(`Exception during file listing for ${bucketName}:`, err);
      setErrorMessage(`Exception: ${err.message}`);
      setTestStatus('error');
    }
  };

  // Function to test file upload
  const testFileUpload = async (bucketName: string) => {
    try {
      setTestStatus('loading');
      
      // Create a simple text file for testing
      const testContent = 'This is a test file ' + new Date().toISOString();
      const testFileName = `test-file-${Date.now()}.txt`;
      
      const file = new File([testContent], testFileName, { type: 'text/plain' });
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(testFileName, file);
        
      if (error) {
        console.error(`Error uploading test file to ${bucketName}:`, error);
        setErrorMessage(`Error uploading file: ${error.message}`);
        setTestStatus('error');
        return;
      }
      
      console.log(`File uploaded successfully to ${bucketName}:`, data);
      
      // Get URL of the uploaded file
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(testFileName);
        
      setTestStatus('success');
      
      return {
        uploadResult: data,
        publicUrl: urlData.publicUrl
      };
    } catch (err: any) {
      console.error(`Exception during file upload to ${bucketName}:`, err);
      setErrorMessage(`Exception: ${err.message}`);
      setTestStatus('error');
    }
  };

  // Function to run all tests and collect results
  const runAllTests = async () => {
    setTestResults(null);
    setErrorMessage('');
    
    const results: any = {
      supabaseUrl: supabase.supabaseUrl,
      timestamp: new Date().toISOString()
    };
    
    // Test 1: List buckets
    try {
      results.bucketListing = await testBucketListing();
      results.hasBuckets = (results.bucketListing || []).length > 0;
      
      // Check for graph-images specifically
      results.hasGraphImagesBucket = (results.bucketListing || []).some(
        (b: any) => b.name === 'graph-images'
      );
    } catch (err: any) {
      results.bucketListingError = err.message;
    }
    
    // Test 2: If graph-images exists, try to list files
    if (results.hasGraphImagesBucket) {
      try {
        results.filesListing = await testBucketFiles('graph-images');
      } catch (err: any) {
        results.fileListingError = err.message;
      }
    }
    
    // Test 3: Try to upload a test file if graph-images exists
    if (results.hasGraphImagesBucket) {
      try {
        results.fileUpload = await testFileUpload('graph-images');
      } catch (err: any) {
        results.fileUploadError = err.message;
      }
    }
    
    // Store all test results
    setTestResults(results);
    console.log('All test results:', results);
  };

  // Check auth status on load
  useEffect(() => {
    if (!loading && !user) {
      setErrorMessage('You must be logged in to run these tests.');
    }
  }, [user, loading]);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Supabase Storage Diagnostic Tool</h1>
        
        {errorMessage && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{errorMessage}</p>
          </div>
        )}
        
        <div className="bg-gray-100 p-4 rounded mb-6">
          <h2 className="text-lg font-semibold mb-2">Environment Info</h2>
          <p><strong>Supabase URL:</strong> {supabase.supabaseUrl || 'Not detected'}</p>
          <p><strong>Auth Status:</strong> {loading ? 'Loading...' : (user ? 'Logged in' : 'Not logged in')}</p>
          <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
        </div>
        
        <div className="mb-6">
          <button
            onClick={runAllTests}
            disabled={loading || !user || testStatus === 'loading'}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {testStatus === 'loading' ? 'Running Tests...' : 'Run All Tests'}
          </button>
        </div>
        
        {buckets.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Available Buckets</h2>
            <ul className="list-disc pl-5">
              {buckets.map((bucket) => (
                <li key={bucket.id} className="mb-2">
                  <span className="font-medium">{bucket.name}</span>
                  <button
                    onClick={() => testBucketFiles(bucket.name)}
                    className="ml-2 bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-sm"
                  >
                    List Files
                  </button>
                  <button
                    onClick={() => testFileUpload(bucket.name)}
                    className="ml-2 bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded text-sm"
                  >
                    Test Upload
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {files.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Files in Bucket</h2>
            <ul className="list-disc pl-5">
              {files.map((file, index) => (
                <li key={index} className="mb-1">
                  {file.name} ({file.metadata?.size || 'Unknown size'})
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {testResults && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Test Results Summary</h2>
            <div className="bg-white p-4 border rounded">
              <p><strong>Supabase URL:</strong> {testResults.supabaseUrl}</p>
              <p><strong>Test Time:</strong> {testResults.timestamp}</p>
              <p><strong>Buckets Found:</strong> {testResults.hasBuckets ? 'Yes' : 'No'}</p>
              <p><strong>'graph-images' Bucket Found:</strong> {testResults.hasGraphImagesBucket ? 'Yes' : 'No'}</p>
              {testResults.bucketListingError && (
                <p className="text-red-600"><strong>Bucket Listing Error:</strong> {testResults.bucketListingError}</p>
              )}
              {testResults.fileListingError && (
                <p className="text-red-600"><strong>File Listing Error:</strong> {testResults.fileListingError}</p>
              )}
              {testResults.fileUploadError && (
                <p className="text-red-600"><strong>File Upload Error:</strong> {testResults.fileUploadError}</p>
              )}
              {testResults.fileUpload && (
                <p className="text-green-600"><strong>Test File Uploaded Successfully!</strong></p>
              )}
            </div>
          </div>
        )}
        
        <div className="text-sm text-gray-500 mt-8">
          <p>This tool helps diagnose issues with Supabase storage connections.</p>
          <p>Check your browser console for detailed logs.</p>
        </div>
      </div>
    </Layout>
  );
};

export default StorageTestPage;