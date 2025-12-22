import { cn } from '@/lib/utils';

interface ModelTagProps {
  model: string;
  className?: string;
}

export default function ModelTag({ model, className }: ModelTagProps) {
  const getTagStyles = (model: string) => {
    const lowerModel = model.toLowerCase();
    if (lowerModel.includes('gpt')) {
      return 'bg-tag-gpt/10 text-tag-gpt border-tag-gpt/20';
    }
    if (lowerModel.includes('claude')) {
      return 'bg-tag-claude/10 text-tag-claude border-tag-claude/20';
    }
    if (lowerModel.includes('gemini')) {
      return 'bg-tag-gemini/10 text-tag-gemini border-tag-gemini/20';
    }
    return 'bg-secondary text-muted-foreground border-border';
  };

  return (
    <span 
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        getTagStyles(model),
        className
      )}
    >
      {model}
    </span>
  );
}
