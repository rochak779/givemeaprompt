import { useState, useEffect } from 'react';
import { Star, Check, X, User, Paperclip, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatTimeAgo, cn } from '@/lib/utils';
import SubmitResultModal from './SubmitResultModal';

interface PromptResult {
  id: string;
  rating: number;
  worked_as_expected: boolean;
  output_text: string | null;
  modifications: string | null;
  attachments: string[];
  created_at: string;
  profiles: {
    username: string | null;
  } | null;
}

interface PromptResultsSectionProps {
  promptId: string;
}

// Helper component to handle signed URL generation for attachments
function AttachmentLinks({ attachments }: { attachments: string[] }) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateSignedUrls = async () => {
      const urls: Record<string, string> = {};
      
      for (const path of attachments.slice(0, 3)) {
        // Check if it's already a full URL (legacy data) or just a path
        if (path.startsWith('http')) {
          urls[path] = path;
        } else {
          const { data } = await supabase.storage
            .from('prompt-attachments')
            .createSignedUrl(path, 3600); // 1 hour expiry
          
          if (data?.signedUrl) {
            urls[path] = data.signedUrl;
          }
        }
      }
      
      setSignedUrls(urls);
      setLoading(false);
    };

    generateSignedUrls();
  }, [attachments]);

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-2">
        <Paperclip className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading attachments...</span>
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <Paperclip className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        {attachments.length} attachment{attachments.length > 1 ? 's' : ''}
      </span>
      <div className="flex gap-2">
        {attachments.slice(0, 3).map((path, i) => {
          const url = signedUrls[path];
          return url ? (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary underline hover:no-underline"
            >
              <ExternalLink className="w-3 h-3" />
              View
            </a>
          ) : null;
        })}
        {attachments.length > 3 && (
          <span className="text-xs text-muted-foreground">
            +{attachments.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
}

export default function PromptResultsSection({ promptId }: PromptResultsSectionProps) {
  const { user } = useAuth();
  const [results, setResults] = useState<PromptResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchResults();
  }, [promptId]);

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('prompt_results')
        .select(`
          id,
          rating,
          worked_as_expected,
          output_text,
          modifications,
          attachments,
          created_at,
          user_id
        `)
        .eq('prompt_id', promptId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately for each result
      const resultsWithProfiles = await Promise.all(
        (data || []).map(async (result) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', result.user_id)
            .maybeSingle();
          
          return {
            ...result,
            attachments: Array.isArray(result.attachments) ? result.attachments as string[] : [],
            profiles: profile
          };
        })
      );
      
      setResults(resultsWithProfiles);
    } catch (error) {
      console.error('Error fetching results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const averageRating = results.length > 0 
    ? results.reduce((sum, r) => sum + r.rating, 0) / results.length 
    : 0;

  const successRate = results.length > 0
    ? Math.round((results.filter(r => r.worked_as_expected).length / results.length) * 100)
    : 0;

  const handleSubmitClick = () => {
    if (!user) {
      window.location.href = '/auth';
      return;
    }
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-secondary rounded w-32 animate-pulse" />
        <div className="h-20 bg-secondary rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Community Results</h2>
          {results.length > 0 && (
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-upvote text-upvote" />
                {averageRating.toFixed(1)} avg
              </span>
              <span className="flex items-center gap-1">
                <Check className="w-4 h-4 text-green-500" />
                {successRate}% success rate
              </span>
              <span>{results.length} results</span>
            </div>
          )}
        </div>
        <Button onClick={handleSubmitClick} size="sm">
          Share Your Result
        </Button>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-8 rounded-lg border border-dashed border-border">
          <p className="text-muted-foreground mb-2">No results yet</p>
          <p className="text-sm text-muted-foreground">
            Be the first to try this prompt and share your experience!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result) => (
            <div 
              key={result.id} 
              className="p-4 rounded-lg border border-border bg-card"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {result.profiles?.username || 'Anonymous'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(result.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "w-3.5 h-3.5",
                              star <= result.rating
                                ? "fill-upvote text-upvote"
                                : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                      </div>
                      <span className={cn(
                        "flex items-center gap-1 text-xs px-1.5 py-0.5 rounded",
                        result.worked_as_expected 
                          ? "bg-green-500/10 text-green-600" 
                          : "bg-red-500/10 text-red-600"
                      )}>
                        {result.worked_as_expected ? (
                          <>
                            <Check className="w-3 h-3" />
                            Worked
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3" />
                            Didn't work
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {result.output_text && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                    Output
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{result.output_text}</p>
                </div>
              )}

              {result.modifications && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                    Modifications
                  </p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {result.modifications}
                  </p>
                </div>
              )}

              {result.attachments.length > 0 && (
                <AttachmentLinks attachments={result.attachments} />
              )}
            </div>
          ))}
        </div>
      )}

      <SubmitResultModal
        open={showModal}
        onOpenChange={setShowModal}
        promptId={promptId}
        onResultSubmitted={fetchResults}
      />
    </div>
  );
}
