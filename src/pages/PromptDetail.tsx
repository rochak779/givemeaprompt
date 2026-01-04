import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Copy, User } from 'lucide-react';
import Header from '@/components/Header';
import ModelTag from '@/components/ModelTag';
import UpvoteButton from '@/components/UpvoteButton';
import CommentSection from '@/components/CommentSection';
import PromptResultsSection from '@/components/PromptResultsSection';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatTimeAgo, copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';

interface PromptData {
  id: string;
  title: string;
  prompt_text: string;
  model: string;
  expected_output: string | null;
  upvote_count: number;
  created_at: string;
  profiles: {
    username: string | null;
  } | null;
}

export default function PromptDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prompt, setPrompt] = useState<PromptData | null>(null);
  const [isUpvoted, setIsUpvoted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchPrompt();
      if (user) {
        checkUserUpvote();
      }
    }
  }, [id, user]);

  const fetchPrompt = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select(`
          id,
          title,
          prompt_text,
          model,
          expected_output,
          upvote_count,
          created_at,
          profiles (username)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      
      if (!data) {
        navigate('/');
        return;
      }

      setPrompt(data);
    } catch (error) {
      console.error('Error fetching prompt:', error);
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const checkUserUpvote = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('upvotes')
        .select('id')
        .eq('prompt_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setIsUpvoted(!!data);
    } catch (error) {
      console.error('Error checking upvote:', error);
    }
  };

  const handleCopy = async () => {
    if (!prompt) return;
    
    try {
      await copyToClipboard(prompt.prompt_text, prompt.id, user?.id);
      toast.success('Copied to clipboard! Try it and share your result.');
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-secondary rounded w-3/4" />
            <div className="h-4 bg-secondary rounded w-1/4" />
            <div className="h-40 bg-secondary rounded" />
          </div>
        </main>
      </div>
    );
  }

  if (!prompt) {
    return null;
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

        {/* Prompt Header */}
        <div className="flex gap-4 mb-8">
          <UpvoteButton 
            promptId={prompt.id}
            initialCount={prompt.upvote_count}
            initialUpvoted={isUpvoted}
          />

          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              {prompt.title}
            </h1>
            
            <div className="flex items-center gap-3 flex-wrap text-sm">
              <ModelTag model={prompt.model} />
              <Link 
                to={prompt.profiles?.username ? `/profile/${prompt.profiles.username}` : '#'}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <User className="w-4 h-4" />
                <span>{prompt.profiles?.username || 'Anonymous'}</span>
              </Link>
              <span className="text-muted-foreground">
                {formatTimeAgo(prompt.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Prompt Content */}
        <div className="space-y-6 mb-12">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                The Prompt
              </h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCopy}
                className="gap-2"
              >
                <Copy className="w-4 h-4" />
                Copy
              </Button>
            </div>
            <div className="p-4 rounded-lg bg-secondary/50 border border-border">
              <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
                {prompt.prompt_text}
              </pre>
            </div>
          </div>

          {prompt.expected_output && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Expected Output
              </h2>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                  {prompt.expected_output}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Community Results */}
        <div className="border-t border-border pt-8 mb-12">
          <PromptResultsSection promptId={prompt.id} />
        </div>

        {/* Comments */}
        <div className="border-t border-border pt-8">
          <CommentSection promptId={prompt.id} />
        </div>
      </main>
    </div>
  );
}
