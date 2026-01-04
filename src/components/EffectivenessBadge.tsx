import { Star, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EffectivenessBadgeProps {
  averageRating: number;
  successRate: number;
  totalResults: number;
}

export default function EffectivenessBadge({ 
  averageRating, 
  successRate, 
  totalResults 
}: EffectivenessBadgeProps) {
  if (totalResults === 0) return null;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
      successRate >= 80 ? "bg-green-500/10 text-green-600" :
      successRate >= 50 ? "bg-yellow-500/10 text-yellow-600" :
      "bg-red-500/10 text-red-600"
    )}>
      <div className="flex items-center gap-0.5">
        <Star className="w-3 h-3 fill-current" />
        <span>{averageRating.toFixed(1)}</span>
      </div>
      <span className="text-muted-foreground/50">•</span>
      <div className="flex items-center gap-0.5">
        <Check className="w-3 h-3" />
        <span>{successRate}%</span>
      </div>
      <span className="text-muted-foreground">({totalResults})</span>
    </div>
  );
}
