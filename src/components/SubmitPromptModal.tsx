import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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

export default function SubmitPromptModal({ open, onOpenChange }: SubmitPromptModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [promptText, setPromptText] = useState("");
  const [model, setModel] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");

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

    setIsSubmitting(true);

    try {
      const { error } = await supabase.from("prompts").insert({
        title: title.trim(),
        prompt_text: promptText.trim(),
        model,
        expected_output: expectedOutput.trim() || null,
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
    setExpectedOutput("");
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
