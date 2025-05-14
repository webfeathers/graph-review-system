// components/StatusBadge.tsx
import React from 'react';
import { Review } from '../types/supabase';

/**
 * Props for the StatusBadge component
 */
interface StatusBadgeProps {
  /** The status to display in the badge */
  status: Review['status'];
}

/**
 * A badge component for displaying status information with appropriate color coding.
 * Used to show the current state of reviews or other status-based information.
 * 
 * Features:
 * - Color-coded status indicators
 * - Consistent styling across the application
 * - Responsive design
 * - Accessible text contrast
 * 
 * Status Colors:
 * - Draft: Light gray background with dark gray text
 * - Submitted: Purple background with white text
 * - In Review: Blue background with white text
 * - Needs Work: Orange background with white text
 * - Approved: Green background with white text
 * - Archived: Gray background with dark gray text
 * 
 * @example
 * // Basic usage
 * <StatusBadge status="In Review" />
 * 
 * @example
 * // Different statuses
 * <div className="space-x-2">
 *   <StatusBadge status="Draft" />
 *   <StatusBadge status="Submitted" />
 *   <StatusBadge status="In Review" />
 *   <StatusBadge status="Needs Work" />
 *   <StatusBadge status="Approved" />
 * </div>
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  /**
   * Returns the appropriate color classes based on the status
   * @returns {string} Tailwind CSS classes for the status color
   */
  const getStatusColor = (status: Review['status']) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800';
      case 'Submitted':
        return 'bg-purple-100 text-purple-800';
      case 'In Review':
        return 'bg-blue-100 text-blue-800';
      case 'Needs Work':
        return 'bg-orange-100 text-orange-800';
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Archived':
        return 'bg-gray-200 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
      {status}
    </span>
  );
};

export default StatusBadge;