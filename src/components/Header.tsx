import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Plus, LogOut, User, Trophy, Zap, Target, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import SubmitPromptModal from './SubmitPromptModal';

export default function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [userXp, setUserXp] = useState<number | null>(null);
  const [currentStreak, setCurrentStreak] = useState<number>(0);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;
    
    const [profileResult, streakResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('total_xp, username')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', user.id)
        .maybeSingle()
    ]);
    
    if (profileResult.data) {
      setUserXp(profileResult.data.total_xp);
    }
    if (streakResult.data) {
      setCurrentStreak(streakResult.data.current_streak);
    }
  };

  const handleSubmitClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setShowSubmitModal(true);
  };

  const handleProfileClick = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .maybeSingle();
    
    if (data?.username) {
      navigate(`/profile/${data.username}`);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">PromptDaily</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Challenges Link */}
            <Link to="/challenges">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Target className="w-4 h-4" />
              </Button>
            </Link>

            {/* Leaderboard Link */}
            <Link to="/leaderboard">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                <Trophy className="w-4 h-4" />
              </Button>
            </Link>

            <Button 
              onClick={handleSubmitClick}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Submit</span>
            </Button>

            {user ? (
              <div className="flex items-center gap-2">
                {/* Streak indicator */}
                {currentStreak > 0 && (
                  <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 text-orange-500 text-sm font-medium">
                    <Flame className="w-3.5 h-3.5" />
                    {currentStreak}
                  </div>
                )}
                
                {/* XP indicator */}
                {userXp !== null && (
                  <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-upvote/10 text-upvote text-sm font-medium">
                    <Zap className="w-3.5 h-3.5" />
                    {userXp}
                  </div>
                )}
                
                <button 
                  onClick={handleProfileClick}
                  className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
                >
                  <User className="w-4 h-4 text-muted-foreground" />
                </button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={signOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <SubmitPromptModal 
        open={showSubmitModal} 
        onOpenChange={setShowSubmitModal} 
      />
    </>
  );
}
