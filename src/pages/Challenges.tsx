import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target, Trophy, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import ChallengeCard from '@/components/ChallengeCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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

interface UserChallenge {
  challenge_id: string;
  progress: number;
  completed: boolean;
}

export default function Challenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<Map<string, UserChallenge>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    fetchChallenges();
  }, [user]);

  const fetchChallenges = async () => {
    try {
      // Fetch active challenges
      const { data: challengeData, error: challengeError } = await supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString().split('T')[0])
        .order('end_date', { ascending: true });

      if (challengeError) throw challengeError;
      setChallenges(challengeData || []);

      // Fetch user's challenge progress
      if (user) {
        const { data: userChallengeData, error: userChallengeError } = await supabase
          .from('user_challenges')
          .select('challenge_id, progress, completed')
          .eq('user_id', user.id);

        if (userChallengeError) throw userChallengeError;
        
        const progressMap = new Map<string, UserChallenge>();
        (userChallengeData || []).forEach(uc => {
          progressMap.set(uc.challenge_id, uc);
        });
        setUserChallenges(progressMap);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }

    setJoiningId(challengeId);

    try {
      const { error } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          challenge_id: challengeId,
          progress: 0
        });

      if (error) throw error;

      setUserChallenges(prev => {
        const newMap = new Map(prev);
        newMap.set(challengeId, { challenge_id: challengeId, progress: 0, completed: false });
        return newMap;
      });

      toast.success('Challenge joined! Good luck!');
    } catch (error) {
      console.error('Error joining challenge:', error);
      toast.error('Failed to join challenge');
    } finally {
      setJoiningId(null);
    }
  };

  const completedCount = Array.from(userChallenges.values()).filter(uc => uc.completed).length;
  const activeCount = userChallenges.size - completedCount;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back Link */}
        <Link 
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to prompts
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-upvote/10 flex items-center justify-center">
            <Target className="w-6 h-6 text-upvote" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Weekly Challenges</h1>
            <p className="text-sm text-muted-foreground">Complete challenges to earn bonus XP</p>
          </div>
        </div>

        {/* Stats */}
        {user && (
          <div className="flex gap-4 mb-8">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{activeCount}</span>
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10">
              <Trophy className="w-4 h-4 text-green-500" />
              <span className="font-medium text-green-500">{completedCount}</span>
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
          </div>
        )}

        {/* Challenges List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-secondary rounded-xl animate-pulse" />
            ))}
          </div>
        ) : challenges.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active challenges right now</p>
            <p className="text-sm text-muted-foreground">Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {challenges.map(challenge => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                userProgress={userChallenges.get(challenge.id)}
                onJoin={() => handleJoinChallenge(challenge.id)}
                isJoining={joiningId === challenge.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
