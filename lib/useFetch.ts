// lib/useFetch.ts
import { useState, useEffect } from 'react';

interface FetchState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

interface FetchOptions {
  dependencies?: any[];
  skip?: boolean;
}

/**
 * Custom hook for data fetching with loading and error states
 * 
 * @param fetchFn The async function to fetch data
 * @param options Optional configuration
 * @returns Object containing data, loading state, and error
 */
export function useFetch<T>(
  fetchFn: () => Promise<T>,
  options: FetchOptions = {}
): FetchState<T> & { refetch: () => Promise<void> } {
  const { dependencies = [], skip = false } = options;
  
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    error: null,
    loading: !skip,
  });

  const fetchData = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await fetchFn();
      setState({ data, loading: false, error: null });
    } catch (error) {
      console.error('Error fetching data:', error);
      setState({ data: null, loading: false, error: error as Error });
    }
  };

  useEffect(() => {
    if (skip) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }
    
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies]);

  return {
    ...state,
    refetch: fetchData,
  };
}

// Example usage for review page
/*
const ReviewPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  
  const {
    data: review,
    loading: reviewLoading,
    error: reviewError
  } = useFetch(
    () => getReviewById(id as string),
    { 
      dependencies: [id],
      skip: !id || !user
    }
  );
  
  const {
    data: comments,
    loading: commentsLoading,
    error: commentsError
  } = useFetch(
    () => getCommentsByReviewId(id as string),
    { 
      dependencies: [id],
      skip: !id || !user
    }
  );
  
  // Now you can safely handle each loading/error state separately
}
*/