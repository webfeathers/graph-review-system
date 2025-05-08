// components/StatusBadge.tsx
import React from 'react';

/**
 * Props for the StatusBadge component
 */
interface StatusBadgeProps {
  /** The status to display in the badge */
  status: 'Submitted' | 'In Review' | 'Needs Work' | 'Approved';
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
 * - Submitted: Gray background with dark text
 * - In Review: Blue background with dark blue text
 * - Needs Work: Yellow background with dark yellow text
 * - Approved: Light green background with green text
 * 
 * @example
 * // Basic usage
 * <StatusBadge status="In Review" />
 * 
 * @example
 * // Different statuses
 * <div className="space-x-2">
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
      case 'Submitted':
        return 'bg-gray-200 text-[#58595b]';
      case 'In Review':
        return 'bg-blue-200 text-blue-800';
      case 'Needs Work':
        return 'bg-yellow-200 text-yellow-800';
      case 'Approved':
        return 'bg-[#d1f0e1] text-[#2db670]';
      default:
        return 'bg-gray-200 text-[#58595b]';
    }
  };

  return (
    <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor()}`}>
      {status}
    </span>
  );
};

export default StatusBadge;