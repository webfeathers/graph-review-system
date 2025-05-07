import React, { useEffect, useRef, useState } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/outline';

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface MentionAutocompleteProps {
  suggestions: User[];
  onSelect: (user: User) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  suggestions,
  onSelect,
  onClose,
  position
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % suggestions.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
          break;
        case 'Enter':
          e.preventDefault();
          onSelect(suggestions[selectedIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, selectedIndex, onSelect, onClose]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto"
      style={{
        top: position.top,
        left: position.left,
        minWidth: '200px',
        maxWidth: '300px'
      }}
    >
      {suggestions.map((user, index) => (
        <div
          key={user.id}
          className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 ${
            index === selectedIndex ? 'bg-blue-50' : ''
          }`}
          onClick={() => onSelect(user)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserCircleIcon className="w-5 h-5 text-gray-500" />
            )}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MentionAutocomplete; 