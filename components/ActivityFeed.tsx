import React from 'react';
import Link from 'next/link';
import { Profile } from '@/types/supabase';
import { 
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  DocumentPlusIcon,
  ArrowPathIcon,
  FolderIcon,
  UserIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';

interface Activity {
  id: string;
  type: 'task_created' | 'task_updated' | 'task_completed' | 'comment_added' | 'review_created' | 'review_updated' | 'review_status_changed' | 'template_file_uploaded';
  review_id: string;
  task_id?: string;
  comment_id?: string;
  metadata: {
    review_title?: string;
    content?: string;
    title?: string;
    priority?: string;
    old_status?: string;
    new_status?: string;
    file_url?: string;
  };
  created_at: string;
  user: {
    id: string;
    name: string;
    role: string;
    email: string;
    points: number;
    created_at: string;
  };
  review?: {
    id: string;
    title: string;
  };
}

interface UserForMentions {
  id: string;
  name: string;
  email: string;
}

interface ActivityFeedProps {
  activities: Activity[];
  allUsers?: UserForMentions[];
}

// Helper to parse and render full-name mentions as links, preserving newlines
const renderContentWithMentions = (text: string, allUsers: UserForMentions[] | undefined) => {
  if (!allUsers || !allUsers.length) return <span>{text}</span>;
  // Build a regex that matches any full name from allUsers
  const namesPattern = allUsers.map(u => u.name.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
  const regex = new RegExp(`@(${namesPattern})`, 'g');
  const parts = text.split(regex);
  return parts.flatMap((part, idx) => {
    // Odd index means a matched name from the capture group
    if (idx % 2 === 1) {
      const name = part;
      const userObj = allUsers.find(u => u.name === name);
      return [
        <Link
          key={idx}
          href={`/profile/${userObj?.id}`}
          className="text-blue-600 font-semibold"
          onClick={e => {
            e.preventDefault();
            if (userObj?.id) {
              window.location.href = `/profile/${userObj.id}`;
            }
          }}
        >
          @{name}
        </Link>
      ];
    }
    // For non-mention parts, split by newlines and interleave <br />
    const lines = part.split('\n');
    return lines.flatMap((line, i) =>
      i === 0 ? [line] : [<br key={`br-${idx}-${i}`} />, line]
    );
  });
};

// Simple modal for image preview (copied from commentSection)
function ImageModal({ src, alt, onClose }: { src: string; alt?: string; onClose: () => void }) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={onClose}>
      <div className="relative" onClick={e => e.stopPropagation()}>
        <img src={src} alt={alt || ''} className="max-h-[80vh] max-w-[90vw] rounded shadow-lg" />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-white bg-opacity-80 rounded-full p-1 hover:bg-opacity-100"
          aria-label="Close image preview"
        >
          <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * A component that displays a feed of recent activities in the system.
 * Shows various types of activities including review updates, comments,
 * project changes, and user actions.
 * 
 * @param activities - Array of activity objects to display
 * 
 * @example
 * ```tsx
 * <ActivityFeed activities={[
 *   {
 *     id: '1',
 *     type: 'review',
 *     action: 'created',
 *     description: 'New Graph Review for Project X',
 *     timestamp: '2024-03-20T10:00:00Z',
 *     link: '/reviews/123',
 *     user: { id: 'user1', name: 'John Doe' }
 *   }
 * ]} />
 * ```
 */
const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, allUsers }) => {
  const [modalImage, setModalImage] = useState<string | null>(null);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'task_created':
        return <DocumentPlusIcon className="h-5 w-5 text-blue-500" />;
      case 'task_updated':
        return <PencilSquareIcon className="h-5 w-5 text-yellow-500" />;
      case 'task_completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'comment_added':
        return <ChatBubbleLeftIcon className="h-5 w-5 text-purple-500" />;
      case 'review_created':
        return <DocumentPlusIcon className="h-5 w-5 text-blue-500" />;
      case 'review_updated':
        return <PencilSquareIcon className="h-5 w-5 text-yellow-500" />;
      case 'review_status_changed':
        return <ArrowPathIcon className="h-5 w-5 text-indigo-500" />;
      case 'template_file_uploaded':
        return <DocumentTextIcon className="h-5 w-5 text-pink-500" />;
      default:
        return null;
    }
  };

  // Custom renderer for images: show as thumbnail, open modal on click
  const renderers = {
    img: ({ src = '', alt = '' }: { src?: string; alt?: string }) => (
      <img
        src={src}
        alt={alt}
        className="inline-block max-h-16 max-w-16 rounded border border-gray-300 cursor-pointer mr-2 mb-2 align-middle"
        style={{ objectFit: 'cover' }}
        onClick={() => setModalImage(src)}
      />
    )
  };

  const renderActivityContent = (activity: Activity) => {
    switch (activity.type) {
      case 'task_created':
        return (
          <>
            created a new task <span className="font-medium">{activity.metadata.title}</span>
            {activity.metadata.priority && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800">
                {activity.metadata.priority} priority
              </span>
            )}
            {' in review '}
            <Link href={`/reviews/${activity.review_id}`} className="text-blue-600 hover:underline">
              {activity.review?.title || `#${activity.review_id}`}
            </Link>
          </>
        );
      case 'task_updated':
        return (
          <>
            updated task <span className="font-medium">{activity.metadata.title}</span>
            <span className="ml-2 text-gray-500">
              from {activity.metadata.old_status} to {activity.metadata.new_status}
            </span>
            {' in review '}
            <Link href={`/reviews/${activity.review_id}`} className="text-blue-600 hover:underline">
              {activity.review?.title || `#${activity.review_id}`}
            </Link>
          </>
        );
      case 'task_completed':
        return (
          <>
            completed task <span className="font-medium">{activity.metadata.title}</span>
            {' in review '}
            <Link href={`/reviews/${activity.review_id}`} className="text-blue-600 hover:underline">
              {activity.review?.title || `#${activity.review_id}`}
            </Link>
          </>
        );
      case 'comment_added':
        return (
          <>
            added a comment to review{' '}
            <Link href={`/reviews/${activity.review_id}`} className="text-blue-600 hover:underline">
              {activity.review?.title || `#${activity.review_id}`}
            </Link>
            {activity.metadata?.content && (
              <div className="mt-2 prose text-sm text-gray-700 bg-gray-50 p-2 rounded">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderers}>
                  {activity.metadata.content}
                </ReactMarkdown>
              </div>
            )}
          </>
        );
      case 'review_created':
        return (
          <>
            created a new review{' '}
            <Link href={`/reviews/${activity.review_id}`} className="text-blue-600 hover:underline">
              {activity.review?.title || `#${activity.review_id}`}
            </Link>
          </>
        );
      case 'review_updated':
        return (
          <>
            updated review{' '}
            <Link href={`/reviews/${activity.review_id}`} className="text-blue-600 hover:underline">
              {activity.review?.title || `#${activity.review_id}`}
            </Link>
          </>
        );
      case 'review_status_changed':
        return (
          <>
            changed review status to <span className="font-medium">{activity.metadata.new_status}</span> for review{' '}
            <Link href={`/reviews/${activity.review_id}`} className="text-blue-600 hover:underline">
              {activity.review?.title || `#${activity.review_id}`}
            </Link>
          </>
        );
      case 'template_file_uploaded':
        return (
          <>
            uploaded a new template file version to review{' '}
            <Link href={`/reviews/${activity.review_id}`} className="text-blue-600 hover:underline">
              {activity.review?.title || `#${activity.review_id}`}
            </Link>
            {activity.metadata?.file_url && (
              <>
                {' '}[
                <a
                  href={activity.metadata.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-600 hover:underline"
                >
                  Download
                </a>
                ]
              </>
            )}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {activities.length === 0 ? (
        <p className="text-gray-500 text-center">No recent activity</p>
      ) : (
        activities.map((activity) => (
          <div key={activity.id} className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-900">
                  <Link href={`/profile/${activity.user.id}`} className="font-medium text-blue-600 hover:underline">
                    {activity.user.name}
                  </Link>{' '}
                  {renderActivityContent(activity)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDate(activity.created_at)}
                </p>
                {modalImage && (
                  <ImageModal src={modalImage} onClose={() => setModalImage(null)} />
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ActivityFeed; 