import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  compact?: boolean;
}

export default function StreakDisplay({ 
  currentStreak, 
  longestStreak, 
  compact = false 
}: StreakDisplayProps) {
  if (compact) {
    if (currentStreak === 0) return null;
    
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-orange-500/10 text-orange-500 text-sm font-medium">
        <Flame className="w-3.5 h-3.5" />
        {currentStreak}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        currentStreak > 0 ? "bg-orange-500/10" : "bg-secondary"
      )}>
        <Flame className={cn(
          "w-5 h-5",
          currentStreak > 0 ? "text-orange-500" : "text-muted-foreground"
        )} />
        <div>
          <p className={cn(
            "text-lg font-bold",
            currentStreak > 0 ? "text-orange-500" : "text-muted-foreground"
          )}>
            {currentStreak}
          </p>
          <p className="text-xs text-muted-foreground">Current</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary">
        <div>
          <p className="text-lg font-bold text-foreground">{longestStreak}</p>
          <p className="text-xs text-muted-foreground">Best</p>
        </div>
      </div>
    </div>
  );
}
