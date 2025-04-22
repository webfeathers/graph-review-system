// components/StatusBadge.tsx
import React from 'react';

interface StatusBadgeProps {
  status: 'Submitted' | 'In Review' | 'Needs Work' | 'Approved';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
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