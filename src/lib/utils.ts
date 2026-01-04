import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

import { supabase } from '@/integrations/supabase/client';

export async function copyToClipboard(text: string, promptId?: string, userId?: string): Promise<void> {
  await navigator.clipboard.writeText(text);
  
  // Track the copy if promptId is provided
  if (promptId) {
    try {
      await supabase
        .from('prompt_copies')
        .insert({
          prompt_id: promptId,
          user_id: userId || null
        });
    } catch (error) {
      console.error('Error tracking copy:', error);
    }
  }
}

export function isWithinLast24Hours(date: Date | string): boolean {
  const now = new Date();
  const past = new Date(date);
  const diffInHours = (now.getTime() - past.getTime()) / (1000 * 60 * 60);
  return diffInHours <= 24;
}
