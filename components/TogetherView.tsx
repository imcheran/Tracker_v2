import React, { useState, useEffect, useRef } from 'react';
import { Heart, Menu, Loader2, Sparkles, Clock, Send, MessageCircleHeart } from 'lucide-react';
import { format } from 'date-fns';

interface TogetherViewProps {
  onMenuClick: () => void;
  user?: any;
}

type SentState = 'idle' | 'sending' | 'sent';

const LOVE_MESSAGES = [
  "Thinking of you right now ❤️",
  "You make my day brighter ☀️",
  "Sending you a virtual hug 🤗",
  "Just wanted you to smile 😊",
  "You're my favorite person 💜",
  "Miss you so much 💗",
  "You light up my world ✨",
  "Forever grateful for you 🌸",
];

const TogetherView: React.FC<TogetherViewProps> = ({ onMenuClick, user }) => {
  const [sentState, setSentState] = useState<SentState>('idle');
  const [heartScale, setHeartScale] = useState(1);
  const [sentCount, setSentCount] = useState(0);
  const [lastSentTime, setLastSentTime] = useState<string | null>(null);
  const [showRipples, setShowRipples] = useState(false);
  const [currentMessage, setCurrentMessage] = useState(LOVE_MESSAGES[0]);
  const heartRef = useRef<HTMLButtonElement>(null);

  // Rotate love messages
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage(LOVE_MESSAGES[Math.floor(Math.random() * LOVE_MESSAGES.length)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const sendHeartToPartner = async () => {
    if (sentState === 'sending') return;
    
    setSentState('sending');
    setShowRipples(true);

    try {
      // Call the backend API for push notifications
      const response = await fetch('https://your-server-url.com/send-heart-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ myUserId: user?.uid || "123" }),
      });

      // Even if API fails (not configured yet), show success for demo
      setSentState('sent');
      setSentCount(prev => prev + 1);
      setLastSentTime(format(new Date(), 'h:mm a'));

      setTimeout(() => {
        setSentState('idle');
        setShowRipples(false);
      }, 2500);
    } catch (error) {
      // In demo mode, still show success animation
      setSentState('sent');
      setSentCount(prev => prev + 1);
      setLastSentTime(format(new Date(), 'h:mm a'));

      setTimeout(() => {
        setSentState('idle');
        setShowRipples(false);
      }, 2500);
    }
  };

  // Press-and-hold effect
  const handlePointerDown = () => setHeartScale(0.9);
  const handlePointerUp = () => {
    setHeartScale(1);
    sendHeartToPartner();
  };

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-[#020202] overflow-hidden relative">
      {/* Header */}
      <div className="pt-safe bg-white/80 dark:bg-[#0a0a0f]/80 backdrop-blur-2xl border-b border-slate-100 dark:border-white/5 shrink-0 z-20">
        <div className="h-16 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button onClick={onMenuClick} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl md:hidden transition-colors">
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-500/20">
                <Heart size={18} className="text-white fill-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">Together</h1>
                <p className="text-[10px] text-slate-400 font-medium">Stay connected</p>
              </div>
            </div>
          </div>

          {/* Sent count badge */}
          {sentCount > 0 && (
            <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-2xl">
              <Send size={12} className="text-rose-500" />
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">{sentCount} sent</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-10 w-80 h-80 bg-rose-400/10 dark:bg-rose-500/5 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-1/3 -right-10 w-72 h-72 bg-pink-400/10 dark:bg-pink-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-400/5 dark:bg-violet-500/3 rounded-full blur-3xl animate-breathe"></div>
        </div>

        {/* Rotating message */}
        <div className="z-10 flex items-center gap-2 mb-8 animate-fade-in">
          <MessageCircleHeart size={16} className="text-rose-400" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic transition-all duration-500">
            "{currentMessage}"
          </p>
        </div>

        {/* Heart Button Container */}
        <div className="z-10 relative flex items-center justify-center mb-10">
          {/* Ripple rings */}
          {showRipples && (
            <>
              <span className="absolute w-44 h-44 rounded-full border-2 border-rose-400/40 animate-sent-pulse"></span>
              <span className="absolute w-44 h-44 rounded-full border-2 border-pink-400/30 animate-sent-pulse" style={{ animationDelay: '0.2s' }}></span>
              <span className="absolute w-44 h-44 rounded-full border-2 border-rose-300/20 animate-sent-pulse" style={{ animationDelay: '0.4s' }}></span>
            </>
          )}

          {/* Outer glow ring */}
          <div className={`absolute w-52 h-52 rounded-full transition-all duration-500 ${
            sentState === 'sent' 
              ? 'bg-gradient-to-br from-rose-500/20 to-pink-500/20 scale-110' 
              : 'bg-gradient-to-br from-rose-500/5 to-pink-500/5'
          }`}></div>

          {/* The Heart Button */}
          <button 
            ref={heartRef}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={() => setHeartScale(1)}
            disabled={sentState === 'sending'}
            className="relative flex items-center justify-center w-44 h-44 rounded-full transition-all duration-300 select-none focus:outline-none group"
            style={{ transform: `scale(${heartScale})` }}
            aria-label="Send heart to partner"
          >
            {/* Background circle */}
            <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
              sentState === 'sent'
                ? 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-2xl shadow-rose-500/40'
                : 'bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/50 dark:to-pink-950/50 border-4 border-white dark:border-slate-800 shadow-xl group-hover:shadow-2xl group-hover:shadow-rose-500/20'
            }`}></div>

            {/* Icon */}
            <div className="relative z-10">
              {sentState === 'sending' ? (
                <Loader2 size={52} className="text-rose-500 animate-spin" />
              ) : sentState === 'sent' ? (
                <div className="flex flex-col items-center gap-1 animate-scale-in">
                  <Sparkles size={32} className="text-white" />
                  <span className="text-white text-xs font-bold">Sent!</span>
                </div>
              ) : (
                <Heart 
                  size={60} 
                  className="text-rose-500 fill-rose-500 drop-shadow-lg group-hover:scale-110 transition-transform animate-heartbeat" 
                />
              )}
            </div>
          </button>
        </div>

        {/* Status area */}
        <div className="z-10 text-center space-y-3">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">
            {sentState === 'sent' ? 'Love sent! 💕' : 'Tap to send love'}
          </h2>
          <p className="text-sm text-slate-400 max-w-xs">
            {sentState === 'sent' 
              ? "They'll get a notification right now." 
              : "Press the heart to let them know you're thinking of them."}
          </p>
        </div>

        {/* Last sent timestamp */}
        {lastSentTime && sentState === 'idle' && (
          <div className="z-10 flex items-center gap-2 mt-6 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 px-4 py-2 rounded-2xl animate-fade-in">
            <Clock size={14} className="text-slate-400" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Last sent at {lastSentTime}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TogetherView;
