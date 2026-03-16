import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';

interface OfflineBannerProps {
  isOnline: boolean;
  syncStatus: 'saved' | 'saving' | 'error' | 'offline';
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOnline, syncStatus }) => {
  if (isOnline && syncStatus !== 'error') return null;
  return (
    <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 text-xs font-bold transition-all animate-slide-down
      ${!isOnline ? 'bg-slate-800 text-white' : 'bg-rose-500 text-white'}`}>
      {!isOnline ? <WifiOff size={13} /> : <Wifi size={13} />}
      {!isOnline ? 'You\'re offline — changes will sync when reconnected' : 'Sync error — tap to retry'}
    </div>
  );
};
