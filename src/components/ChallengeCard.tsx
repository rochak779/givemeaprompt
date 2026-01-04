import { Target, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: string;
  target_count: number;
  xp_reward: number;
  start_date: string;
  end_date: string;
}

interface UserProgress {
  progress: number;
  completed: boolean;
}

interface ChallengeCardProps {
  challenge: Challenge;
  userProgress?: UserProgress;
  onJoin?: () => void;
  isJoining?: boolean;
}

export default function ChallengeCard({ 
  challenge, 
  userProgress, 
  onJoin,
  isJoining = false
}: ChallengeCardProps) {
  const progress = userProgress?.progress || 0;
  const completed = userProgress?.completed || false;
  const progressPercent = Math.min((progress / challenge.target_count) * 100, 100);
  
  const daysLeft = Math.ceil(
    (new Date(challenge.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className={cn(
      "p-4 rounded-xl border bg-card",
      completed ? "border-green-500/30 bg-green-500/5" : "border-border"
    )}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center",
            completed ? "bg-green-500/10 text-green-500" : "bg-upvote/10 text-upvote"
          )}>
            {completed ? <Check className="w-5 h-5" /> : <Target className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-semibold">{challenge.title}</h3>
            <p className="text-sm text-muted-foreground">{challenge.description}</p>
          </div>
        </div>
        
        <div className="text-right flex-shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-upvote/10 text-upvote text-sm font-semibold">
            +{challenge.xp_reward} XP
          </span>
        </div>
      </div>

      {/* Progress */}
      {userProgress && (
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {progress}/{challenge.target_count}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {daysLeft > 0 ? `${daysLeft} days left` : 'Ends today'}
        </div>

        {!userProgress && !completed && (
          <Button 
            size="sm" 
            onClick={onJoin}
            disabled={isJoining}
          >
            {isJoining ? 'Joining...' : 'Join Challenge'}
          </Button>
        )}
        
        {completed && (
          <span className="text-sm font-medium text-green-500 flex items-center gap-1">
            <Check className="w-4 h-4" />
            Completed!
          </span>
        )}
      </div>
    </div>
  );
}
