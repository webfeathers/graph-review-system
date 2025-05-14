import { BadgeType } from '../constants';
import {
  StarIcon,
  TrophyIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ClockIcon,
  SparklesIcon,
  CheckCircleIcon,
  ChatBubbleLeftIcon,
  HeartIcon,
  RocketLaunchIcon,
  UserIcon,
  CloudIcon
} from '@heroicons/react/24/solid';
import Link from 'next/link';

interface BadgeDisplayProps {
  badge: BadgeType;
  size?: 'sm' | 'md' | 'lg';
}

const BADGE_ICONS: Record<BadgeType, typeof StarIcon> = {
  [BadgeType.EXPERT_REVIEWER]: TrophyIcon,
  [BadgeType.ACTIVE_REVIEWER]: StarIcon,
  [BadgeType.CONTRIBUTOR]: UserIcon,
  [BadgeType.REVIEW_MASTER]: CheckCircleIcon,
  [BadgeType.QUALITY_REVIEWER]: SparklesIcon,
  [BadgeType.HELPFUL_REVIEWER]: HeartIcon,
  [BadgeType.ENGAGED_COMMENTER]: ChatBubbleLeftRightIcon,
  [BadgeType.INSIGHTFUL_COMMENTER]: ChatBubbleLeftIcon,
  [BadgeType.EARLY_ADOPTER]: RocketLaunchIcon,
  [BadgeType.TEAM_PLAYER]: UserGroupIcon,
  [BadgeType.CONSISTENT_CONTRIBUTOR]: ClockIcon,
  [BadgeType.ICE_BREAKER]: CloudIcon
};

const BADGE_COLORS: Record<BadgeType, { bg: string; text: string }> = {
  [BadgeType.EXPERT_REVIEWER]: { bg: 'bg-purple-100', text: 'text-purple-800' },
  [BadgeType.ACTIVE_REVIEWER]: { bg: 'bg-blue-100', text: 'text-blue-800' },
  [BadgeType.CONTRIBUTOR]: { bg: 'bg-green-100', text: 'text-green-800' },
  [BadgeType.REVIEW_MASTER]: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
  [BadgeType.QUALITY_REVIEWER]: { bg: 'bg-pink-100', text: 'text-pink-800' },
  [BadgeType.HELPFUL_REVIEWER]: { bg: 'bg-red-100', text: 'text-red-800' },
  [BadgeType.ENGAGED_COMMENTER]: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  [BadgeType.INSIGHTFUL_COMMENTER]: { bg: 'bg-orange-100', text: 'text-orange-800' },
  [BadgeType.EARLY_ADOPTER]: { bg: 'bg-emerald-100', text: 'text-emerald-800' },
  [BadgeType.TEAM_PLAYER]: { bg: 'bg-cyan-100', text: 'text-cyan-800' },
  [BadgeType.CONSISTENT_CONTRIBUTOR]: { bg: 'bg-violet-100', text: 'text-violet-800' },
  [BadgeType.ICE_BREAKER]: { bg: 'bg-sky-100', text: 'text-sky-800' }
};

const SIZE_CLASSES = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6'
};

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ badge, size = 'md' }) => {
  const Icon = BADGE_ICONS[badge];
  const colors = BADGE_COLORS[badge];
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
      <Icon className={iconSize} />
      <span className="text-sm font-medium">{badge}</span>
    </div>
  );
};

export default BadgeDisplay; 