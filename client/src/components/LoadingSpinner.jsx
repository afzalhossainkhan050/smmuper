import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ fullPage = false, size = 36, text = 'Loading SMMuper...' }) {
  if (fullPage) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-bg-app text-text-primary gap-3 p-4">
        <Loader2 size={size} className="text-primary animate-spin" />
        <span className="text-xs font-bold text-muted-foreground tracking-wider uppercase animate-pulse">
          {text}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-6 text-primary">
      <Loader2 size={size} className="animate-spin" />
    </div>
  );
}
