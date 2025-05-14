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

interface Activity {
  id: string;
  type: 'task_created' | 'task_updated' | 'task_completed' | 'comment_added' | 'review_created' | 'review_updated' | 'review_status_changed';
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

interface ActivityFeedProps {
  activities: Activity[];
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
const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
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
      default:
        return null;
    }
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
              <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {activity.metadata.content}
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
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ActivityFeed; 