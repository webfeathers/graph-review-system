// components/EmptyState.tsx
import React, { ReactNode } from 'react';

/**
 * Props for the EmptyState component
 */
interface EmptyStateProps {
  /** The message to display in the empty state */
  message: string;
  /** Optional icon to display above the message */
  icon?: ReactNode;
  /** Optional action element (e.g., button) to display below the message */
  action?: ReactNode;
}

/**
 * A component for displaying empty states in the application.
 * Used when there is no data to display or when a section is empty.
 * 
 * Features:
 * - Centered layout with consistent spacing
 * - Optional icon support
 * - Optional action button/link
 * - Light gray background for visual distinction
 * - Responsive design
 * 
 * @example
 * // Basic usage
 * <EmptyState message="No reviews found" />
 * 
 * @example
 * // With icon
 * <EmptyState 
 *   message="No projects available"
 *   icon={<ProjectIcon className="w-12 h-12 text-gray-400" />}
 * />
 * 
 * @example
 * // With action
 * <EmptyState 
 *   message="No comments yet"
 *   action={<Button>Add Comment</Button>}
 * />
 * 
 * @example
 * // Complete example
 * <EmptyState 
 *   message="No data available"
 *   icon={<DataIcon className="w-12 h-12 text-gray-400" />}
 *   action={<Button variant="primary">Refresh</Button>}
 * />
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ message, icon, action }) => {
  return (
    <div className="text-center py-12 bg-gray-50 rounded-lg">
      {icon && <div className="mb-4">{icon}</div>}
      <p className="text-gray-500 mb-4">{message}</p>
      {action && <div>{action}</div>}
    </div>
  );
};