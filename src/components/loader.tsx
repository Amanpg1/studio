import { Loader2 } from 'lucide-react';
import { Logo } from './logo';

export function FullScreenLoader() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
      <Logo />
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground">Loading FoodWise AI...</p>
    </div>
  );
}

export function InlineLoader({ text = 'Loading...' }: { text?: string }) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{text}</span>
      </div>
    );
  }
