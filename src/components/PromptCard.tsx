import { Link } from 'react-router-dom';
import { Copy, MessageCircle } from 'lucide-react';
import { cn, formatTimeAgo, copyToClipboard } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ModelTag from './ModelTag';
import UpvoteButton from './UpvoteButton';
import { toast } from 'sonner';

interface PromptCardProps {
  id: string;
  title: string;
  promptText: string;
  model: string;
  author: string;
  upvoteCount: number;
  isUpvoted: boolean;
  createdAt: string;
  commentCount?: number;
  rank?: number;
}

export default function PromptCard({
  id,
  title,
  promptText,
  model,
  author,
  upvoteCount,
  isUpvoted,
  createdAt,
  commentCount = 0,
  rank
}: PromptCardProps) {
  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await copyToClipboard(promptText);
      toast.success('Copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <Link 
      to={`/prompt/${id}`}
      className={cn(
        'group block p-4 rounded-xl border border-border bg-card',
        'shadow-card hover:shadow-card-hover transition-all duration-200',
        'hover:border-border/80'
      )}
    >
      <div className="flex gap-4">
        {/* Upvote Section */}
        <div className="flex-shrink-0">
          <UpvoteButton 
            promptId={id} 
            initialCount={upvoteCount} 
            initialUpvoted={isUpvoted}
          />
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                {rank && (
                  <span className="text-sm font-bold text-upvote">#{rank}</span>
                )}
                <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                  {title}
                </h3>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {promptText}
              </p>

              <div className="flex items-center gap-3 flex-wrap">
                <ModelTag model={model} />
                <span className="text-xs text-muted-foreground">
                  by <span className="font-medium">{author || 'Anonymous'}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(createdAt)}
                </span>
                {commentCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageCircle className="w-3 h-3" />
                    {commentCount}
                  </span>
                )}
              </div>
            </div>

            {/* Copy Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
