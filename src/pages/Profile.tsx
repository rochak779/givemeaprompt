import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import Header from '@/components/Header';
import UserStatsCard from '@/components/UserStatsCard';
import PromptCard from '@/components/PromptCard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ProfileData {
  id: string;
  username: string | null;
  total_xp: number;
  prompts_submitted: number;
  upvotes_received: number;
  prompts_copied: number;
  created_at: string;
}

interface UserPrompt {
  id: string;
  title: string;
  prompt_text: string;
  model: string;
  upvote_count: number;
  created_at: string;
}

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [prompts, setPrompts] = useState<UserPrompt[]>([]);
  const [upvotedPromptIds, setUpvotedPromptIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (username) {
      fetchProfile();
    }
  }, [username]);

  const fetchProfile = async () => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profileData) {
        setIsLoading(false);
        return;
      }

      setProfile(profileData);

      // Fetch user's prompts
      const { data: promptsData, error: promptsError } = await supabase
        .from('prompts')
        .select('id, title, prompt_text, model, upvote_count, created_at')
        .eq('author_id', profileData.id)
        .order('created_at', { ascending: false });

      if (promptsError) throw promptsError;
      setPrompts(promptsData || []);

      // Check which prompts current user has upvoted
      if (user) {
        const { data: upvotes } = await supabase
          .from('upvotes')
          .select('prompt_id')
          .eq('user_id', user.id);

        if (upvotes) {
          setUpvotedPromptIds(new Set(upvotes.map(u => u.prompt_id)));
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-secondary rounded w-48" />
            <div className="h-40 bg-secondary rounded" />
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-3xl text-center">
          <h1 className="text-2xl font-bold mb-4">User not found</h1>
          <Link to="/" className="text-primary hover:underline">
            Go back home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Back Link */}
        <Link 
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to prompts
        </Link>

        {/* Profile Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile.username || 'Anonymous'}</h1>
            <p className="text-sm text-muted-foreground">
              Member since {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8">
          <UserStatsCard
            totalXp={profile.total_xp}
            promptsSubmitted={profile.prompts_submitted}
            upvotesReceived={profile.upvotes_received}
            promptsCopied={profile.prompts_copied}
          />
        </div>

        {/* User's Prompts */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            Prompts by {profile.username || 'this user'}
          </h2>
          
          {prompts.length === 0 ? (
            <div className="text-center py-8 rounded-lg border border-dashed border-border">
              <p className="text-muted-foreground">No prompts yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  id={prompt.id}
                  title={prompt.title}
                  promptText={prompt.prompt_text}
                  model={prompt.model}
                  author={profile.username || 'Anonymous'}
                  upvoteCount={prompt.upvote_count}
                  isUpvoted={upvotedPromptIds.has(prompt.id)}
                  createdAt={prompt.created_at}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
