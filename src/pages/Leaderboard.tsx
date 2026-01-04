import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Zap, ArrowUp, User } from 'lucide-react';
import Header from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { getUserLevel } from '@/components/UserStatsCard';
import { cn } from '@/lib/utils';

interface LeaderboardUser {
  id: string;
  username: string | null;
  total_xp: number;
  upvotes_received: number;
}

export default function Leaderboard() {
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'xp' | 'upvotes'>('xp');

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy]);

  const fetchLeaderboard = async () => {
    try {
      const orderColumn = sortBy === 'xp' ? 'total_xp' : 'upvotes_received';
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, total_xp, upvotes_received')
        .order(orderColumn, { ascending: false })
        .limit(20);

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-upvote/10 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-upvote" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Top prompt contributors</p>
          </div>
        </div>

        {/* Sort Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSortBy('xp')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              sortBy === 'xp' 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            <Zap className="w-4 h-4" />
            By XP
          </button>
          <button
            onClick={() => setSortBy('upvotes')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              sortBy === 'upvotes' 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowUp className="w-4 h-4" />
            By Upvotes
          </button>
        </div>

        {/* Leaderboard List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-secondary rounded-lg animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No users yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user, index) => {
              const { level, title } = getUserLevel(user.total_xp);
              
              return (
                <Link
                  key={user.id}
                  to={user.username ? `/profile/${user.username}` : '#'}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border border-border bg-card",
                    "hover:border-border/80 hover:shadow-card-hover transition-all",
                    index < 3 && "bg-upvote/5 border-upvote/20"
                  )}
                >
                  {/* Rank */}
                  <div className="w-10 text-center font-bold text-lg">
                    {getRankIcon(index)}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {user.username || 'Anonymous'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Level {level} • {title}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {sortBy === 'xp' ? (
                        <>
                          <Zap className="w-4 h-4 text-upvote" />
                          <span className="font-semibold">{user.total_xp}</span>
                        </>
                      ) : (
                        <>
                          <ArrowUp className="w-4 h-4 text-upvote" />
                          <span className="font-semibold">{user.upvotes_received}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {sortBy === 'xp' ? 'XP' : 'upvotes'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
