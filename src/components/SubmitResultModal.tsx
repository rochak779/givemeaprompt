import { useState, useRef } from 'react';
import { Star, Paperclip, X, FileText, Image, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SubmitResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  promptId: string;
  onResultSubmitted?: () => void;
}

interface AttachmentFile {
  file: File;
  preview?: string;
}

const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime'
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export default function SubmitResultModal({ 
  open, 
  onOpenChange, 
  promptId,
  onResultSubmitted 
}: SubmitResultModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [workedAsExpected, setWorkedAsExpected] = useState(true);
  const [outputText, setOutputText] = useState('');
  const [modifications, setModifications] = useState('');
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: AttachmentFile[] = [];

    Array.from(files).forEach(file => {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a supported file type`);
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds the 20MB limit`);
        return;
      }

      const attachment: AttachmentFile = { file };

      if (file.type.startsWith('image/')) {
        attachment.preview = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    });

    setAttachments(prev => [...prev, ...newAttachments]);
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const attachment = prev[index];
      if (attachment.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const uploadAttachments = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const attachment of attachments) {
      const fileExt = attachment.file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error } = await supabase.storage
        .from('prompt-attachments')
        .upload(fileName, attachment.file);

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      const { data: urlData } = supabase.storage
        .from('prompt-attachments')
        .getPublicUrl(fileName);

      uploadedUrls.push(urlData.publicUrl);
    }

    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to submit a result');
      return;
    }

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setIsSubmitting(true);

    try {
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        attachmentUrls = await uploadAttachments();
      }

      const { error } = await supabase
        .from('prompt_results')
        .insert({
          prompt_id: promptId,
          user_id: user.id,
          rating,
          worked_as_expected: workedAsExpected,
          output_text: outputText || null,
          modifications: modifications || null,
          attachments: attachmentUrls
        });

      if (error) throw error;

      toast.success('Result shared! +5 XP earned');
      resetForm();
      onOpenChange(false);
      onResultSubmitted?.();
    } catch (error) {
      console.error('Error submitting result:', error);
      toast.error('Failed to submit result');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRating(0);
    setHoverRating(0);
    setWorkedAsExpected(true);
    setOutputText('');
    setModifications('');
    attachments.forEach(a => a.preview && URL.revokeObjectURL(a.preview));
    setAttachments([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share Your Result</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>How well did it work? *</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star 
                    className={cn(
                      "w-7 h-7 transition-colors",
                      (hoverRating || rating) >= star 
                        ? "fill-upvote text-upvote" 
                        : "text-muted-foreground"
                    )} 
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Worked as Expected Toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="worked-toggle" className="cursor-pointer">
              Did it work as expected?
            </Label>
            <Switch
              id="worked-toggle"
              checked={workedAsExpected}
              onCheckedChange={setWorkedAsExpected}
            />
          </div>

          {/* Output Text */}
          <div className="space-y-2">
            <Label htmlFor="output">What output did you get?</Label>
            <Textarea
              id="output"
              placeholder="Paste or describe the output you received..."
              value={outputText}
              onChange={(e) => setOutputText(e.target.value)}
              rows={3}
            />
          </div>

          {/* Modifications */}
          <div className="space-y-2">
            <Label htmlFor="modifications">Any modifications you made?</Label>
            <Textarea
              id="modifications"
              placeholder="Describe any changes you made to the prompt..."
              value={modifications}
              onChange={(e) => setModifications(e.target.value)}
              rows={2}
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>Attachments (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES.join(',')}
              onChange={handleFileSelect}
              multiple
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Paperclip className="w-4 h-4" />
              Add Files
            </Button>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg text-sm"
                  >
                    {getFileIcon(attachment.file)}
                    <span className="max-w-[120px] truncate">
                      {attachment.file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || rating === 0}>
              {isSubmitting ? 'Submitting...' : 'Share Result'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
