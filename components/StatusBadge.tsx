import React from 'react';

interface StatusBadgeProps {
  status: 'Submitted' | 'In Review' | 'Needs Work' | 'Approved';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'Submitted':
        return 'bg-gray-200 text-gray-800';
      case 'In Review':
        return 'bg-blue-200 text-blue-800';
      case 'Needs Work':
        return 'bg-yellow-200 text-yellow-800';
      case 'Approved':
        return 'bg-green-200 text-green-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor()}`}>
      {status}
    </span>
  );
};

export default StatusBadge;