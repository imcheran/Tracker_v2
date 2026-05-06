import React, { useState } from 'react';
import { Heart, Menu, Loader2 } from 'lucide-react';

interface TogetherViewProps {
  onMenuClick: () => void;
  user?: any;
}

const TogetherView: React.FC<TogetherViewProps> = ({ onMenuClick, user }) => {
  const [isLoading, setIsLoading] = useState(false);

  const sendHeartToPartner = async () => {
    setIsLoading(true);
    try {
      // Call the backend API you set up for push notifications
      const response = await fetch('https://your-server-url.com/send-heart-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ myUserId: user?.uid || "123" }),
      });

      if (response.ok) {
        alert("Sent! They know you're thinking of them.");
      } else {
        alert("Oops, make sure your partner is linked!");
      }
    } catch (error) {
      console.error(error);
      alert("Error: Could not connect to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      {/* Header */}
      <div className="pt-safe bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-100 dark:border-slate-800 shrink-0 z-20">
        <div className="h-16 flex items-center px-4">
          <button onClick={onMenuClick} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full md:hidden transition-colors">
            <Menu size={24} />
          </button>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white ml-2 flex items-center gap-2">
            <Heart size={20} className="text-rose-500 fill-rose-500" />
            Together
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-rose-400/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen animate-float"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-pink-400/20 rounded-full blur-3xl mix-blend-multiply dark:mix-blend-screen animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="z-10 text-center max-w-sm w-full glass p-8 rounded-[40px] shadow-2xl flex flex-col items-center">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Send some love</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-10 text-sm">Let them know they're on your mind.</p>

          <button 
            onClick={sendHeartToPartner}
            disabled={isLoading}
            className={`
              relative flex items-center justify-center w-40 h-40 rounded-full 
              bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/40 dark:to-pink-900/40
              border-[8px] border-white dark:border-slate-800 shadow-xl
              hover:scale-105 active:scale-95 transition-all duration-300
              ${isLoading ? 'opacity-80' : 'animate-breathe hover:shadow-rose-500/30'}
            `}
          >
            {isLoading ? (
              <Loader2 size={48} className="text-rose-500 animate-spin" />
            ) : (
              <Heart size={64} className="text-rose-500 fill-rose-500 drop-shadow-md" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TogetherView;
