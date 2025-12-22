import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Plus, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import SubmitPromptModal from './SubmitPromptModal';

export default function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const handleSubmitClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setShowSubmitModal(true);
  };

  return (
    <>
      <header className="sticky top-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">PromptDaily</span>
          </Link>

          <div className="flex items-center gap-3">
            <Button 
              onClick={handleSubmitClick}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Submit Prompt</span>
            </Button>

            {user ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={signOut}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <SubmitPromptModal 
        open={showSubmitModal} 
        onOpenChange={setShowSubmitModal} 
      />
    </>
  );
}
