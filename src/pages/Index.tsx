import { useState, useEffect } from 'react';
import { Calendar, TrendingUp } from 'lucide-react';
import Header from '@/components/Header';
import PromptCard from '@/components/PromptCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { isWithinLast24Hours } from '@/lib/utils';

interface Prompt {
  id: string;
  title: string;
  prompt_text: string;
  model: string;
  upvote_count: number;
  created_at: string;
  profiles: {
    username: string | null;
  } | null;
}

interface Upvote {
  prompt_id: string;
}

export default function Index() {
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPrompts();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserUpvotes();
    } else {
      setUserUpvotes(new Set());
    }
  }, [user]);

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select(`
          id,
          title,
          prompt_text,
          model,
          upvote_count,
          created_at,
          profiles (username)
        `)
        .order('upvote_count', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserUpvotes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('upvotes')
        .select('prompt_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setUserUpvotes(new Set((data as Upvote[])?.map(u => u.prompt_id) || []));
    } catch (error) {
      console.error('Error fetching upvotes:', error);
    }
  };

  // Filter prompts from last 24 hours
  const todayPrompts = prompts.filter(p => isWithinLast24Hours(p.created_at));
  const olderPrompts = prompts.filter(p => !isWithinLast24Hours(p.created_at));

  // Top 10 of today
  const top10Today = todayPrompts.slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Discover Today's Best AI Prompts
          </h1>
          <p className="text-muted-foreground text-lg">
            A daily curated collection of the most powerful prompts, voted by the community.
          </p>
        </div>

        {/* Today's Top 10 */}
        <section className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-upvote" />
            <h2 className="text-xl font-semibold">Today's Top 10</h2>
            <span className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className="h-32 rounded-xl bg-secondary animate-pulse"
                />
              ))}
            </div>
          ) : top10Today.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-xl">
              <p className="text-muted-foreground mb-2">No prompts submitted today yet.</p>
              <p className="text-sm text-muted-foreground">Be the first to share an amazing prompt!</p>
            </div>
          ) : (
            <div className="space-y-3 stagger-children">
              {top10Today.map((prompt, index) => (
                <PromptCard
                  key={prompt.id}
                  id={prompt.id}
                  title={prompt.title}
                  promptText={prompt.prompt_text}
                  model={prompt.model}
                  author={prompt.profiles?.username || 'Anonymous'}
                  upvoteCount={prompt.upvote_count}
                  isUpvoted={userUpvotes.has(prompt.id)}
                  createdAt={prompt.created_at}
                  rank={index + 1}
                />
              ))}
            </div>
          )}
        </section>

        {/* Older Prompts */}
        {olderPrompts.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
              Previous Prompts
            </h2>
            <div className="space-y-3">
              {olderPrompts.slice(0, 10).map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  id={prompt.id}
                  title={prompt.title}
                  promptText={prompt.prompt_text}
                  model={prompt.model}
                  author={prompt.profiles?.username || 'Anonymous'}
                  upvoteCount={prompt.upvote_count}
                  isUpvoted={userUpvotes.has(prompt.id)}
                  createdAt={prompt.created_at}
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} PromptDaily. Share prompts, inspire creativity.</p>
        </div>
      </footer>
    </div>
  );
}
