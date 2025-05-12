// components/StatusBadge.tsx
import React from 'react';

/**
 * Props for the StatusBadge component
 */
interface StatusBadgeProps {
  /** The status to display in the badge */
  status: 'Draft' | 'Submitted' | 'In Review' | 'Needs Work' | 'Approved';
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
  const getStatusColor = () => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-700';
      case 'Submitted':
        return 'bg-purple-600 text-white';
      case 'In Review':
        return 'bg-blue-600 text-white';
      case 'Needs Work':
        return 'bg-orange-500 text-white';
      case 'Approved':
        return 'bg-green-600 text-white';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <span className={`inline-flex items-center justify-center min-w-[80px] px-3 py-1 text-sm font-medium rounded-full ${getStatusColor()}`}>
      {status}
    </span>
  );
};

export default StatusBadge;