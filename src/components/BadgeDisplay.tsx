import { Award, Flame, Star, Target, Trophy, Zap, Users, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type BadgeType = 
  | 'first_prompt'
  | 'first_upvote'
  | 'top_10'
  | 'helpful_reviewer'
  | 'prolific_author'
  | 'popular_prompt'
  | 'streak_7'
  | 'streak_30'
  | 'early_adopter'
  | 'challenge_winner';

interface BadgeInfo {
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

export const BADGE_INFO: Record<BadgeType, BadgeInfo> = {
  first_prompt: {
    name: 'First Prompt',
    description: 'Submitted your first prompt',
    icon: <Star className="w-4 h-4" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10'
  },
  first_upvote: {
    name: 'First Vote',
    description: 'Cast your first upvote',
    icon: <Zap className="w-4 h-4" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  top_10: {
    name: 'Top 10',
    description: 'Had a prompt in the daily Top 10',
    icon: <Trophy className="w-4 h-4" />,
    color: 'text-upvote',
    bgColor: 'bg-upvote/10'
  },
  helpful_reviewer: {
    name: 'Helpful Reviewer',
    description: 'Shared 10+ prompt results',
    icon: <Users className="w-4 h-4" />,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10'
  },
  prolific_author: {
    name: 'Prolific Author',
    description: 'Submitted 25+ prompts',
    icon: <Award className="w-4 h-4" />,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  },
  popular_prompt: {
    name: 'Popular Prompt',
    description: 'Got 50+ upvotes on a single prompt',
    icon: <Star className="w-4 h-4" />,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10'
  },
  streak_7: {
    name: '7-Day Streak',
    description: 'Active for 7 consecutive days',
    icon: <Flame className="w-4 h-4" />,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
  streak_30: {
    name: '30-Day Streak',
    description: 'Active for 30 consecutive days',
    icon: <Flame className="w-4 h-4" />,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10'
  },
  early_adopter: {
    name: 'Early Adopter',
    description: 'Joined in the first month',
    icon: <Clock className="w-4 h-4" />,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10'
  },
  challenge_winner: {
    name: 'Challenge Winner',
    description: 'Completed a weekly challenge',
    icon: <Target className="w-4 h-4" />,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10'
  }
};

interface BadgeDisplayProps {
  badges: BadgeType[];
  size?: 'sm' | 'md' | 'lg';
  showEmpty?: boolean;
  maxDisplay?: number;
}

export default function BadgeDisplay({ 
  badges, 
  size = 'md', 
  showEmpty = false,
  maxDisplay = 10 
}: BadgeDisplayProps) {
  const displayedBadges = badges.slice(0, maxDisplay);
  const remainingCount = badges.length - maxDisplay;

  if (badges.length === 0 && !showEmpty) {
    return null;
  }

  if (badges.length === 0 && showEmpty) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No badges earned yet. Keep contributing!
      </div>
    );
  }

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizeClasses = {
    sm: '[&_svg]:w-3 [&_svg]:h-3',
    md: '[&_svg]:w-4 [&_svg]:h-4',
    lg: '[&_svg]:w-5 [&_svg]:h-5'
  };

  return (
    <div className="flex flex-wrap gap-2">
      {displayedBadges.map((badge) => {
        const info = BADGE_INFO[badge];
        return (
          <div
            key={badge}
            className={cn(
              "group relative rounded-full flex items-center justify-center transition-transform hover:scale-110",
              sizeClasses[size],
              iconSizeClasses[size],
              info.bgColor,
              info.color
            )}
            title={`${info.name}: ${info.description}`}
          >
            {info.icon}
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover border border-border rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              <p className="text-xs font-medium text-foreground">{info.name}</p>
              <p className="text-xs text-muted-foreground">{info.description}</p>
            </div>
          </div>
        );
      })}
      
      {remainingCount > 0 && (
        <div className={cn(
          "rounded-full flex items-center justify-center bg-secondary text-muted-foreground text-xs font-medium",
          sizeClasses[size]
        )}>
          +{remainingCount}
        </div>
      )}
    </div>
  );
}

// Component to display all badges with full details
export function BadgeGrid({ badges }: { badges: BadgeType[] }) {
  const allBadgeTypes = Object.keys(BADGE_INFO) as BadgeType[];
  
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {allBadgeTypes.map((badgeType) => {
        const info = BADGE_INFO[badgeType];
        const isEarned = badges.includes(badgeType);
        
        return (
          <div
            key={badgeType}
            className={cn(
              "p-3 rounded-lg border text-center transition-all",
              isEarned 
                ? "border-border bg-card" 
                : "border-dashed border-border/50 bg-secondary/30 opacity-50"
            )}
          >
            <div className={cn(
              "w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2",
              isEarned ? info.bgColor : "bg-secondary",
              isEarned ? info.color : "text-muted-foreground"
            )}>
              {info.icon}
            </div>
            <p className={cn(
              "text-xs font-medium",
              isEarned ? "text-foreground" : "text-muted-foreground"
            )}>
              {info.name}
            </p>
          </div>
        );
      })}
    </div>
  );
}
