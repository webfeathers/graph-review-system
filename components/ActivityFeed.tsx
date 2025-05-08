import React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Activity {
  id: string;
  type: 'review' | 'comment' | 'project' | 'user';
  action: string;
  description: string;
  timestamp: string;
  link?: string;
  user?: {
    id: string;
    name: string;
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
export const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities }) => {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'review':
        return (
          <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'comment':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        );
      case 'project':
        return (
          <svg className="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case 'user':
        return (
          <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
    }
  };

  return (
    <div className="flow-root">
      <ul role="list" className="-mb-8">
        {activities.map((activity, activityIdx) => (
          <li key={activity.id}>
            <div className="relative pb-8">
              {activityIdx !== activities.length - 1 ? (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex space-x-3">
                <div>
                  <span className="h-8 w-8 rounded-full bg-gray-50 flex items-center justify-center ring-8 ring-white">
                    {getActivityIcon(activity.type)}
                  </span>
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      {activity.user ? (
                        <Link href={`/profile/${activity.user.id}`} className="font-medium text-gray-900">
                          {activity.user.name}
                        </Link>
                      ) : null}{' '}
                      {activity.action}{' '}
                      {activity.link ? (
                        <Link href={activity.link} className="font-medium text-gray-900">
                          {activity.description}
                        </Link>
                      ) : (
                        activity.description
                      )}
                    </p>
                  </div>
                  <div className="text-right text-sm whitespace-nowrap text-gray-500">
                    <time dateTime={activity.timestamp}>
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}; 