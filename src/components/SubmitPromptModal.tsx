import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Paperclip, X, FileText, Image, Video } from "lucide-react";

interface SubmitPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MODEL_OPTIONS = [
  "GPT-4",
  "GPT-4o",
  "GPT-3.5",
  "GPT-5",
  "Claude 3.5 Sonnet",
  "Claude 3 Opus",
  "Claude 3 Haiku",
  "Gemini 3 Pro",
  "Gemini 3 Flash",
  "Gemini 3 Deep Think",
  "Nano Banana",
  "Llama 3",
  "Mistral",
  "Other",
];

const ACCEPTED_FILE_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

interface AttachmentFile {
  file: File;
  preview?: string;
}

export default function SubmitPromptModal({ open, onOpenChange }: SubmitPromptModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [promptText, setPromptText] = useState("");
  const [model, setModel] = useState("");
  const [customModelName, setCustomModelName] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        toast.error(`${file.name}: File type not supported`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: File too large (max 20MB)`);
        continue;
      }
      
      const newAttachment: AttachmentFile = { file };
      if (file.type.startsWith("image/")) {
        newAttachment.preview = URL.createObjectURL(file);
      }
      setAttachments((prev) => [...prev, newAttachment]);
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const attachment = prev[index];
      if (attachment.preview) {
        URL.revokeObjectURL(attachment.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return <Image className="w-4 h-4" />;
    if (type.startsWith("video/")) return <Video className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const uploadAttachments = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];
    
    for (const attachment of attachments) {
      const fileExt = attachment.file.name.split(".").pop();
      const fileName = `${user!.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error } = await supabase.storage
        .from("prompt-attachments")
        .upload(fileName, attachment.file);
      
      if (error) throw error;
      
      const { data: urlData } = supabase.storage
        .from("prompt-attachments")
        .getPublicUrl(fileName);
      
      uploadedUrls.push(urlData.publicUrl);
    }
    
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Please sign in to submit a prompt");
      return;
    }

    if (!title.trim() || !promptText.trim() || !model) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (model === "Other" && !customModelName.trim()) {
      toast.error("Please enter the custom model name");
      return;
    }

    setIsSubmitting(true);

    try {
      let attachmentUrls: string[] = [];
      if (attachments.length > 0) {
        attachmentUrls = await uploadAttachments();
      }

      const { error } = await supabase.from("prompts").insert({
        title: title.trim(),
        prompt_text: promptText.trim(),
        model,
        custom_model_name: model === "Other" ? customModelName.trim() : null,
        expected_output: expectedOutput.trim() || null,
        attachments: attachmentUrls,
        author_id: user.id,
      });

      if (error) throw error;

      toast.success("Prompt submitted successfully!");
      onOpenChange(false);
      resetForm();

      // Refresh the page to show the new prompt
      window.location.reload();
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to submit prompt");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setPromptText("");
    setModel("");
    setCustomModelName("");
    setExpectedOutput("");
    attachments.forEach((a) => a.preview && URL.revokeObjectURL(a.preview));
    setAttachments([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Submit a Prompt</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="A catchy title for your prompt"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt Text *</Label>
            <Textarea
              id="prompt"
              placeholder="Paste your prompt here..."
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              className="min-h-[120px] resize-none"
              maxLength={5000}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model Used *</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {model === "Other" && (
            <div className="space-y-2">
              <Label htmlFor="customModel">Custom Model Name *</Label>
              <Input
                id="customModel"
                placeholder="Enter the model name (e.g., Mixtral 8x7B)"
                value={customModelName}
                onChange={(e) => setCustomModelName(e.target.value)}
                maxLength={100}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="output">Expected Output (Optional)</Label>
            <Textarea
              id="output"
              placeholder="Describe or paste the expected output..."
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={5000}
            />
          </div>

          <div className="space-y-2">
            <Label>Attachments (Optional)</Label>
            <p className="text-xs text-muted-foreground">
              Supported: PDF, Word docs, images, videos (max 20MB each)
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Paperclip className="w-4 h-4 mr-2" />
              Add Attachments
            </Button>

            {attachments.length > 0 && (
              <div className="space-y-2 mt-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-muted rounded-md"
                  >
                    {getFileIcon(attachment.file.type)}
                    <span className="flex-1 text-sm truncate">
                      {attachment.file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(attachment.file.size / 1024 / 1024).toFixed(1)}MB
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttachment(index)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Prompt"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
