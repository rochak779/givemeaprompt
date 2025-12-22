import { useState } from 'react';
import { ArrowBigUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface UpvoteButtonProps {
  promptId: string;
  initialCount: number;
  initialUpvoted: boolean;
  onUpvoteChange?: (newCount: number, upvoted: boolean) => void;
}

export default function UpvoteButton({ 
  promptId, 
  initialCount, 
  initialUpvoted,
  onUpvoteChange 
}: UpvoteButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [count, setCount] = useState(initialCount);
  const [upvoted, setUpvoted] = useState(initialUpvoted);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpvote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.error('Please sign in to upvote');
      navigate('/auth');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    setIsAnimating(true);

    try {
      if (upvoted) {
        // Remove upvote
        const { error } = await supabase
          .from('upvotes')
          .delete()
          .eq('prompt_id', promptId)
          .eq('user_id', user.id);

        if (error) throw error;

        const newCount = count - 1;
        setCount(newCount);
        setUpvoted(false);
        onUpvoteChange?.(newCount, false);
      } else {
        // Add upvote
        const { error } = await supabase
          .from('upvotes')
          .insert({ prompt_id: promptId, user_id: user.id });

        if (error) {
          if (error.code === '23505') {
            toast.error('You have already upvoted this prompt');
            return;
          }
          throw error;
        }

        const newCount = count + 1;
        setCount(newCount);
        setUpvoted(true);
        onUpvoteChange?.(newCount, true);
      }
    } catch (error) {
      console.error('Upvote error:', error);
      toast.error('Failed to update vote');
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  return (
    <button
      onClick={handleUpvote}
      disabled={isLoading}
      className={cn(
        'flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg border transition-all duration-200',
        'hover:shadow-sm active:scale-95',
        upvoted 
          ? 'bg-upvote/10 border-upvote/30 text-upvote' 
          : 'bg-secondary border-border text-muted-foreground hover:border-upvote/30 hover:text-upvote',
        isLoading && 'opacity-50 cursor-not-allowed'
      )}
    >
      <ArrowBigUp 
        className={cn(
          'w-5 h-5 transition-transform',
          isAnimating && 'animate-upvote',
          upvoted && 'fill-current'
        )} 
      />
      <span className="text-sm font-semibold">{count}</span>
    </button>
  );
}
