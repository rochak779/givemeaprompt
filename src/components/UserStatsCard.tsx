import { Zap, FileText, ArrowUp, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserStatsCardProps {
  totalXp: number;
  promptsSubmitted: number;
  upvotesReceived: number;
  promptsCopied: number;
  compact?: boolean;
}

export function getUserLevel(xp: number): { level: number; title: string; nextLevelXp: number; progress: number } {
  const levels = [
    { threshold: 0, title: 'Newcomer' },
    { threshold: 50, title: 'Contributor' },
    { threshold: 150, title: 'Active Member' },
    { threshold: 300, title: 'Prompt Crafter' },
    { threshold: 500, title: 'Expert' },
    { threshold: 1000, title: 'Master' },
    { threshold: 2000, title: 'Legend' },
    { threshold: 5000, title: 'Grandmaster' },
  ];

  let currentLevel = 0;
  let nextLevelXp = levels[1].threshold;

  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].threshold) {
      currentLevel = i;
      nextLevelXp = levels[i + 1]?.threshold || levels[i].threshold;
      break;
    }
  }

  const currentThreshold = levels[currentLevel].threshold;
  const progress = ((xp - currentThreshold) / (nextLevelXp - currentThreshold)) * 100;

  return {
    level: currentLevel + 1,
    title: levels[currentLevel].title,
    nextLevelXp,
    progress: Math.min(progress, 100)
  };
}

export default function UserStatsCard({
  totalXp,
  promptsSubmitted,
  upvotesReceived,
  promptsCopied,
  compact = false
}: UserStatsCardProps) {
  const { level, title, nextLevelXp, progress } = getUserLevel(totalXp);

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/50">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-upvote" />
          <span className="font-semibold text-sm">{totalXp} XP</span>
        </div>
        <span className="text-xs text-muted-foreground">Level {level}</span>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-border bg-card">
      {/* Level & XP Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-upvote" />
            <span className="text-xl font-bold">{totalXp} XP</span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Level {level} • {title}
          </p>
        </div>
        <div className={cn(
          "px-3 py-1.5 rounded-full text-xs font-semibold",
          "bg-upvote/10 text-upvote"
        )}>
          Lvl {level}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{totalXp} XP</span>
          <span>{nextLevelXp} XP</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-upvote transition-all duration-500 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-secondary/50">
          <FileText className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-lg font-semibold">{promptsSubmitted}</p>
          <p className="text-xs text-muted-foreground">Prompts</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-secondary/50">
          <ArrowUp className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-lg font-semibold">{upvotesReceived}</p>
          <p className="text-xs text-muted-foreground">Upvotes</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-secondary/50">
          <Copy className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
          <p className="text-lg font-semibold">{promptsCopied}</p>
          <p className="text-xs text-muted-foreground">Copies</p>
        </div>
      </div>
    </div>
  );
}
