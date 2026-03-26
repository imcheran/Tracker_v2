import React, { useState, useEffect, useRef } from 'react';
import {
  Heart, Zap, Clock, Camera, BookOpen, Target, ChevronLeft,
  Plus, Send, Image as ImageIcon, Smile, Moon, Sun, Coffee,
  CheckCircle2, Circle, Flame, Calendar, X, Edit3, Check,
  MapPin, Plane, Sparkles, Bell, BellOff, Users, Lock
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { Habit, Task } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CoupleProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  timezone: string; // e.g. "Asia/Kolkata"
  status: 'free' | 'busy' | 'sleeping' | 'studying' | 'working' | 'do_not_disturb';
  statusUntil?: string; // ISO string
  statusMessage?: string;
  lastSeen?: string; // ISO string
}

export interface PhotoMoment {
  id: string;
  uid: string;
  imageUrl: string; // base64 or URL
  caption?: string;
  timestamp: string; // ISO
  reactions?: { uid: string; emoji: string }[];
}

export interface JournalEntry {
  id: string;
  uid: string;
  content: string;
  mood?: 'love' | 'happy' | 'miss' | 'sad' | 'excited';
  timestamp: string; // ISO
  isRead?: boolean;
}

export interface CheckIn {
  id: string;
  uid: string;
  type: 'morning' | 'night';
  message: string;
  mood?: string;
  timestamp: string; // ISO
}

export interface CouplesMeetup {
  id: string;
  title: string;
  date: string; // ISO
  location?: string;
  notes?: string;
}

export interface SharedHabitChallenge {
  id: string;
  habitId: string;
  partnerHabitId?: string;
  name: string;
  icon: string;
  color: string;
  durationDays: number;
  startDate: string; // ISO
  myProgress: Record<string, boolean>; // date → done
  partnerProgress: Record<string, boolean>;
}

export interface CouplesData {
  myProfile: CoupleProfile;
  partnerProfile?: CoupleProfile;
  photoWall: PhotoMoment[];
  journal: JournalEntry[];
  checkIns: CheckIn[];
  nextMeetup?: CouplesMeetup;
  sharedChallenges: SharedHabitChallenge[];
  nudgesReceived: number;
}

interface CouplesViewProps {
  couplesData: CouplesData;
  onUpdateCouplesData: (data: CouplesData) => void;
  onLinkPartner?: (partnerUid: string) => Promise<void>;
  onUpdateHabits?: (habits: Habit[]) => void;
  onAddTask?: (task: Task) => void;
  onMenuClick?: () => void;
  myUid: string;
  habits: Habit[];
}

// ─── Partner Linking Modal ────────────────────────────────────────────

const PartnerLinkingModal: React.FC<{
  onLink: (inviteCode: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
  inviteCode?: string; // Optional: if provided, skip to code entry
}> = ({ onLink, onClose, isLoading, inviteCode: initialCode }) => {
  const [mode, setMode] = useState<'choose' | 'enter'>('choose');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  const handleLink = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter the invite code');
      return;
    }
    try {
      await onLink(inviteCode.trim().toUpperCase());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link partner');
    }
  };

  if (initialCode || mode === 'enter') {
    return (
      <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-end justify-center">
        <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl p-5 pb-10 animate-slide-up space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Heart size={20} className="text-pink-500" /> Enter partner's code
            </h3>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase">Invite code from partner</label>
            <div className="relative">
              <input
                value={inviteCode}
                onChange={e => { setInviteCode(e.target.value.toUpperCase()); setError(''); }}
                placeholder="E.g. ABC1D2E3F4G5"
                maxLength={12}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400 text-slate-800 dark:text-slate-100 font-mono tracking-widest"
                disabled={isLoading}
              />
              {isLoading && <div className="absolute right-3 top-3 w-5 h-5 border-2 border-pink-400/20 border-t-pink-500 rounded-full animate-spin" />}
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <p className="text-xs text-slate-400 text-center">
            Once linked, you'll see their status, share photos, and sync your schedules
          </p>

          <button
            onClick={handleLink}
            disabled={isLoading || !inviteCode.trim()}
            className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold hover:from-pink-600 hover:to-rose-600 disabled:opacity-40 transition-all"
          >
            {isLoading ? 'Linking...' : 'Link Partner'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl p-5 pb-10 animate-slide-up space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Heart size={20} className="text-pink-500" /> Link your partner
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>

        <p className="text-xs text-slate-400 text-center">
          One user shares an invite code, the other enters it to link permanently
        </p>

        <div className="space-y-3">
          <button
            onClick={() => setMode('enter')}
            className="w-full py-3 flex items-center justify-center gap-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Lock size={16} />
            I have a code
          </button>
          <button
            onClick={() => {
              setMode('enter');
              alert('Go to Settings and generate an invite code to share with your partner');
            }}
            className="w-full py-3 flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold hover:from-pink-600 hover:to-rose-600 transition-all"
          >
            <Users size={16} />
            Generate a code to share
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  free:            { label: 'Free now',        color: 'bg-green-400',  text: 'text-green-600',  dark: 'dark:text-green-400',  icon: '🟢' },
  busy:            { label: 'Busy',             color: 'bg-yellow-400', text: 'text-yellow-600', dark: 'dark:text-yellow-400', icon: '🟡' },
  sleeping:        { label: 'Sleeping',         color: 'bg-indigo-400', text: 'text-indigo-600', dark: 'dark:text-indigo-400', icon: '🌙' },
  studying:        { label: 'Studying',         color: 'bg-blue-400',   text: 'text-blue-600',   dark: 'dark:text-blue-400',   icon: '📚' },
  working:         { label: 'Working',          color: 'bg-orange-400', text: 'text-orange-600', dark: 'dark:text-orange-400', icon: '💼' },
  do_not_disturb:  { label: 'Do not disturb',   color: 'bg-red-400',    text: 'text-red-600',    dark: 'dark:text-red-400',    icon: '🔕' },
};

const MOOD_OPTIONS = [
  { value: 'love',    emoji: '❤️',  label: 'Love'    },
  { value: 'happy',   emoji: '😊',  label: 'Happy'   },
  { value: 'miss',    emoji: '🥺',  label: 'Missing' },
  { value: 'sad',     emoji: '😔',  label: 'Sad'     },
  { value: 'excited', emoji: '🎉',  label: 'Excited' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimeInZone(timezone: string): string {
  try {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return format(new Date(), 'hh:mm a');
  }
}

function getDateInZone(timezone: string): string {
  try {
    return new Date().toLocaleDateString('en-US', {
      timeZone: timezone,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return format(new Date(), 'EEE, MMM d');
  }
}

function isNightTime(timezone: string): boolean {
  try {
    const h = parseInt(
      new Date().toLocaleString('en-US', { timeZone: timezone, hour: 'numeric', hour12: false })
    );
    return h >= 21 || h < 6;
  } catch {
    return false;
  }
}

function formatCountdown(targetDate: string) {
  const target = new Date(targetDate);
  const now = new Date();
  if (target <= now) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  const totalSecs = Math.floor((target.getTime() - now.getTime()) / 1000);
  const days    = Math.floor(totalSecs / 86400);
  const hours   = Math.floor((totalSecs % 86400) / 3600);
  const minutes = Math.floor((totalSecs % 3600) / 60);
  const seconds = totalSecs % 60;
  return { days, hours, minutes, seconds, isPast: false };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const Avatar: React.FC<{ profile: CoupleProfile; size?: 'sm' | 'md' | 'lg'; showStatus?: boolean }> = ({
  profile, size = 'md', showStatus = true
}) => {
  const sizeClass = { sm: 'w-8 h-8', md: 'w-11 h-11', lg: 'w-16 h-16' }[size];
  const dotSize   = { sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-4 h-4' }[size];
  const statusCfg = STATUS_CONFIG[profile.status];
  const night     = isNightTime(profile.timezone);

  return (
    <div className="relative inline-block">
      <div className={`${sizeClass} rounded-full overflow-hidden border-2 border-white dark:border-slate-800 shadow`}>
        {profile.photoURL ? (
          <img src={profile.photoURL} alt={profile.displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
            {profile.displayName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      {showStatus && (
        <div className={`absolute -bottom-0.5 -right-0.5 ${dotSize} ${statusCfg.color} rounded-full border-2 border-white dark:border-slate-900`} />
      )}
    </div>
  );
};

// ─── Countdown Widget ─────────────────────────────────────────────────────────

const CountdownWidget: React.FC<{
  meetup?: CouplesMeetup;
  onEdit: () => void;
}> = ({ meetup, onEdit }) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!meetup) {
    return (
      <button
        onClick={onEdit}
        className="w-full py-6 flex flex-col items-center gap-2 border-2 border-dashed border-pink-200 dark:border-pink-900/40 rounded-2xl text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/10 transition-colors"
      >
        <Plus size={24} />
        <span className="text-sm font-medium">Set next meetup date</span>
      </button>
    );
  }

  const cd = formatCountdown(meetup.date);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 p-5 text-white shadow-lg">
      <div className="absolute inset-0 opacity-10">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute text-2xl select-none"
            style={{ left: `${(i * 17) % 100}%`, top: `${(i * 23) % 100}%`, opacity: 0.5 }}
          >
            ✦
          </div>
        ))}
      </div>
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-bold opacity-70 uppercase tracking-widest">Next meetup</p>
            <p className="font-bold text-lg leading-tight">{meetup.title}</p>
            {meetup.location && (
              <p className="text-xs opacity-70 flex items-center gap-1 mt-0.5">
                <MapPin size={10} /> {meetup.location}
              </p>
            )}
          </div>
          <button onClick={onEdit} className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
            <Edit3 size={14} />
          </button>
        </div>

        {cd.isPast ? (
          <div className="text-center py-3">
            <p className="text-3xl font-black">You're together! 🎉</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[
              { val: cd.days,    label: 'Days'    },
              { val: cd.hours,   label: 'Hours'   },
              { val: cd.minutes, label: 'Mins'    },
              { val: cd.seconds, label: 'Secs'    },
            ].map(({ val, label }) => (
              <div key={label} className="bg-white/20 rounded-xl py-2 text-center backdrop-blur-sm">
                <div className="text-2xl font-black tabular-nums leading-none">
                  {String(val).padStart(2, '0')}
                </div>
                <div className="text-[9px] font-bold opacity-70 uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs opacity-60 mt-3 text-center">
          {format(new Date(meetup.date), 'EEEE, MMMM d yyyy')}
        </p>
      </div>
    </div>
  );
};

// ─── Dual Clock ───────────────────────────────────────────────────────────────

const DualClock: React.FC<{ myProfile: CoupleProfile; partnerProfile?: CoupleProfile }> = ({
  myProfile, partnerProfile
}) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(id);
  }, []);

  const ClockCard = ({ profile, label }: { profile: CoupleProfile; label: string }) => {
    const night = isNightTime(profile.timezone);
    const statusCfg = STATUS_CONFIG[profile.status];
    return (
      <div className={`flex-1 rounded-2xl p-4 ${night
        ? 'bg-indigo-950 dark:bg-indigo-950 border border-indigo-800'
        : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {night ? <Moon size={14} className="text-indigo-300" /> : <Sun size={14} className="text-amber-500" />}
          <span className={`text-xs font-bold ${night ? 'text-indigo-300' : 'text-amber-600 dark:text-amber-400'}`}>{label}</span>
        </div>
        <div className={`text-2xl font-black tabular-nums tracking-tight ${night ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
          {getTimeInZone(profile.timezone)}
        </div>
        <div className={`text-[10px] mt-0.5 ${night ? 'text-indigo-400' : 'text-slate-400'}`}>
          {getDateInZone(profile.timezone)}
        </div>
        <div className={`flex items-center gap-1.5 mt-2 text-xs ${statusCfg.text} ${statusCfg.dark}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${statusCfg.color}`} />
          {statusCfg.label}
          {profile.statusMessage && <span className="opacity-70">· {profile.statusMessage}</span>}
        </div>
        <div className={`text-[10px] mt-0.5 opacity-50 ${night ? 'text-indigo-400' : 'text-slate-400'}`}>
          {profile.timezone.replace('_', ' ')}
        </div>
      </div>
    );
  };

  return (
    <div className="flex gap-3">
      <ClockCard profile={myProfile} label="You" />
      {partnerProfile
        ? <ClockCard profile={partnerProfile} label={partnerProfile.displayName.split(' ')[0]} />
        : (
          <div className="flex-1 rounded-2xl p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 text-sm text-center">
            Link a partner to<br />see their time
          </div>
        )
      }
    </div>
  );
};

// ─── Smart Call Window ────────────────────────────────────────────────────────

const SmartCallWindow: React.FC<{ myTz: string; partnerTz: string }> = ({ myTz, partnerTz }) => {
  const windows: { label: string; myTime: string; partnerTime: string; quality: 'great' | 'ok' | 'bad' }[] = [];

  const hours = [7, 9, 12, 17, 19, 21];
  hours.forEach(h => {
    const d = new Date();
    d.setHours(h, 0, 0, 0);
    const myH = parseInt(d.toLocaleString('en-US', { timeZone: myTz, hour: 'numeric', hour12: false }));
    const pHStr = d.toLocaleString('en-US', { timeZone: partnerTz, hour: 'numeric', hour12: false });
    const pH = parseInt(pHStr);
    const myOk = myH >= 7 && myH <= 22;
    const pOk  = pH  >= 7 && pH  <= 22;
    const quality = myOk && pOk ? 'great' : (myOk || pOk ? 'ok' : 'bad');
    if (quality !== 'bad') {
      windows.push({
        label: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        myTime: d.toLocaleTimeString('en-US', { timeZone: myTz, hour: '2-digit', minute: '2-digit', hour12: true }),
        partnerTime: d.toLocaleTimeString('en-US', { timeZone: partnerTz, hour: '2-digit', minute: '2-digit', hour12: true }),
        quality,
      });
    }
  });

  const best = windows.filter(w => w.quality === 'great').slice(0, 3);

  if (!best.length) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-purple-500" />
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Best times to call today</h3>
      </div>
      <div className="space-y-2">
        {best.map((w, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
              {w.myTime} <span className="opacity-50">you</span>
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-purple-300" />
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
              <span className="opacity-50">them</span> {w.partnerTime}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Nudge Button ─────────────────────────────────────────────────────────────

const NudgeButton: React.FC<{
  partnerName: string;
  onNudge: () => void;
  lastNudge?: string;
}> = ({ partnerName, onNudge, lastNudge }) => {
  const [pressed, setPressed] = useState(false);
  const [ripple, setRipple] = useState(false);

  const handlePress = () => {
    if (pressed) return;
    setPressed(true);
    setRipple(true);
    onNudge();
    setTimeout(() => setRipple(false), 800);
    setTimeout(() => setPressed(false), 3000);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handlePress}
        className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 active:scale-90
          ${pressed
            ? 'bg-pink-200 dark:bg-pink-900/40 shadow-pink-200'
            : 'bg-gradient-to-br from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 shadow-pink-300'
          }`}
      >
        {ripple && (
          <>
            <div className="absolute inset-0 rounded-full bg-pink-400 animate-ping opacity-40" />
            <div className="absolute inset-[-8px] rounded-full bg-pink-300 animate-ping opacity-20" style={{ animationDelay: '0.15s' }} />
          </>
        )}
        <Heart size={32} className={`text-white ${pressed ? 'scale-90' : ''} transition-transform`} fill="white" />
      </button>
      <div className="text-center">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
          {pressed ? `Sent to ${partnerName}! 💕` : `Thinking of ${partnerName}`}
        </p>
        {lastNudge && !pressed && (
          <p className="text-[10px] text-slate-400 mt-0.5">
            Last: {formatDistanceToNow(new Date(lastNudge), { addSuffix: true })}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Status Picker ────────────────────────────────────────────────────────────

const StatusPicker: React.FC<{
  current: CoupleProfile['status'];
  message?: string;
  onUpdate: (status: CoupleProfile['status'], message?: string) => void;
  onClose: () => void;
}> = ({ current, message, onUpdate, onClose }) => {
  const [msg, setMsg] = useState(message || '');

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl p-5 pb-10 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Set your status</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {(Object.entries(STATUS_CONFIG) as [CoupleProfile['status'], typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => { onUpdate(key, msg); onClose(); }}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left
                ${current === key
                  ? 'border-pink-400 bg-pink-50 dark:bg-pink-900/20'
                  : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                }`}
            >
              <div className={`w-2 h-2 rounded-full ${cfg.color} shrink-0`} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{cfg.label}</span>
            </button>
          ))}
        </div>
        <input
          value={msg}
          onChange={e => setMsg(e.target.value)}
          placeholder="Add a note (e.g. 'back at 5pm')"
          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-pink-400 transition-colors text-slate-800 dark:text-slate-100"
        />
      </div>
    </div>
  );
};

// ─── Photo Wall ───────────────────────────────────────────────────────────────

const PhotoWall: React.FC<{
  photos: PhotoMoment[];
  myUid: string;
  onAdd: (photo: Omit<PhotoMoment, 'id'>) => void;
  onReact: (photoId: string, emoji: string) => void;
  partnerName: string;
}> = ({ photos, myUid, onAdd, onReact, partnerName }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    
    // Check file size (max 5MB)
    if (f.size > 5 * 1024 * 1024) {
      setError('Photo is too large (max 5MB)');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setPreview(ev.target.result as string);
      }
    };
    reader.onerror = () => setError('Failed to read photo');
    reader.readAsDataURL(f);
  };

  const handleSubmit = () => {
    if (!preview) return;
    onAdd({
      uid: myUid,
      imageUrl: preview,
      caption: caption || undefined,
      timestamp: new Date().toISOString(),
    });
    setPreview(null);
    setCaption('');
    setShowAdd(false);
  };

  const REACTIONS = ['❤️', '😍', '🥺', '😂', '🔥'];

  const sorted = [...photos].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <Camera size={15} className="text-pink-500" /> Photo moments
        </h3>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="p-1.5 bg-pink-50 dark:bg-pink-900/20 text-pink-500 rounded-lg hover:bg-pink-100 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 animate-fade-in space-y-3">
          {!preview ? (
            <div className="space-y-2">
              <button
                onClick={() => cameraRef.current?.click()}
                className="w-full h-32 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-pink-300 dark:border-pink-700 rounded-xl text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors bg-pink-50/30  dark:bg-pink-900/5"
              >
                <Camera size={28} />
                <div>
                  <div className="text-sm font-bold">📸 Take a Photo</div>
                  <div className="text-xs opacity-70">Use your camera</div>
                </div>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full h-24 flex flex-col items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ImageIcon size={24} />
                <div className="text-sm font-bold">🖼️ Choose from Gallery</div>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {error && (
                <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400">
                  ⚠️ {error}
                </div>
              )}
              <img src={preview} alt="preview" className="w-full h-40 object-cover rounded-xl" />
              <input
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Add a caption..."
                maxLength={200}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-pink-400 text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setPreview(null);
                    setCaption('');
                    setError(null);
                  }} 
                  className="flex-1 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Remove
                </button>
                <button 
                  onClick={handleSubmit} 
                  className="flex-1 py-2 text-sm font-bold text-white bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl hover:from-pink-600 hover:to-rose-600 transition-all"
                >
                  ✓ Share
                </button>
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        </div>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-center text-slate-400 py-6">No moments yet. Add your first photo!</p>
      ) : (
        <div className="columns-2 gap-2 space-y-2">
          {sorted.map(photo => (
            <div key={photo.id} className="break-inside-avoid rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 group">
              <img src={photo.imageUrl} alt={photo.caption} className="w-full object-cover" />
              <div className="p-2">
                {photo.caption && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-1.5 leading-tight">{photo.caption}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {photo.uid === myUid ? 'You' : partnerName} · {formatDistanceToNow(new Date(photo.timestamp), { addSuffix: true })}
                  </span>
                  <div className="flex gap-1">
                    {REACTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => onReact(photo.id, emoji)}
                        className="text-xs opacity-0 group-hover:opacity-100 hover:scale-125 transition-all"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                {photo.reactions && photo.reactions.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {photo.reactions.map((r, i) => (
                      <span key={i} className="text-xs bg-slate-50 dark:bg-slate-800 rounded-full px-1.5 py-0.5">{r.emoji}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Journal ──────────────────────────────────────────────────────────────────

const JournalSection: React.FC<{
  entries: JournalEntry[];
  myUid: string;
  partnerName: string;
  onAdd: (entry: Omit<JournalEntry, 'id'>) => void;
}> = ({ entries, myUid, partnerName, onAdd }) => {
  const [text, setText] = useState('');
  const [mood, setMood] = useState<JournalEntry['mood'] | undefined>(undefined);
  const [showCompose, setShowCompose] = useState(false);

  const handleSend = () => {
    if (!text.trim()) return;
    onAdd({
      uid: myUid,
      content: text.trim(),
      mood,
      timestamp: new Date().toISOString(),
      isRead: false,
    });
    setText('');
    setMood(undefined);
    setShowCompose(false);
  };

  const sorted = [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
          <BookOpen size={15} className="text-purple-500" /> Letters to each other
        </h3>
        <button
          onClick={() => setShowCompose(v => !v)}
          className="p-1.5 bg-purple-50 dark:bg-purple-900/20 text-purple-500 rounded-lg hover:bg-purple-100 transition-colors"
        >
          <Edit3 size={16} />
        </button>
      </div>

      {showCompose && (
        <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/30 animate-fade-in">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`Write something to ${partnerName}...`}
            rows={4}
            className="w-full bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-xl px-3 py-2 text-sm outline-none focus:border-purple-400 resize-none text-slate-800 dark:text-slate-100 mb-3"
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {MOOD_OPTIONS.map(m => (
                <button
                  key={m.value}
                  onClick={() => setMood(mood === m.value ? undefined : m.value as JournalEntry['mood'])}
                  className={`text-lg p-1 rounded-lg transition-all ${mood === m.value ? 'scale-125' : 'opacity-50 hover:opacity-100'}`}
                  title={m.label}
                >
                  {m.emoji}
                </button>
              ))}
            </div>
            <button
              onClick={handleSend}
              disabled={!text.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 disabled:opacity-40 transition-colors"
            >
              <Send size={14} /> Send
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {sorted.slice(0, 5).map(entry => {
          const isMe = entry.uid === myUid;
          const moodObj = MOOD_OPTIONS.find(m => m.value === entry.mood);
          return (
            <div
              key={entry.id}
              className={`p-3 rounded-2xl border text-sm leading-relaxed
                ${isMe
                  ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-900/40 ml-4'
                  : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 mr-4'
                }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-bold ${isMe ? 'text-purple-600 dark:text-purple-300' : 'text-slate-500 dark:text-slate-400'}`}>
                  {isMe ? 'You' : partnerName} {moodObj && moodObj.emoji}
                </span>
                <span className="text-[10px] text-slate-400">
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-200">{entry.content}</p>
            </div>
          );
        })}
        {entries.length === 0 && (
          <p className="text-sm text-center text-slate-400 py-4">Your private letters will appear here.</p>
        )}
      </div>
    </div>
  );
};

// ─── Check-in ─────────────────────────────────────────────────────────────────

const CheckInSection: React.FC<{
  checkIns: CheckIn[];
  myUid: string;
  partnerName: string;
  onAdd: (checkIn: Omit<CheckIn, 'id'>) => void;
}> = ({ checkIns, myUid, partnerName, onAdd }) => {
  const hour = new Date().getHours();
  const type: CheckIn['type'] = hour < 12 ? 'morning' : 'night';
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const alreadyCheckedIn = checkIns.some(
    c => c.uid === myUid && c.type === type && c.timestamp.startsWith(todayStr)
  );

  const todayCheckIns = checkIns.filter(c => c.timestamp.startsWith(todayStr));
  const partnerCheckIn = todayCheckIns.find(c => c.uid !== myUid && c.type === type);

  const MORNING_PROMPTS = [
    "How are you starting your day? ☀️",
    "Morning! What's on your mind? 🌅",
    "Good morning! Set your intention today 🌿",
  ];
  const NIGHT_PROMPTS = [
    "How was your day? 🌙",
    "What made you smile today? ✨",
    "Goodnight message for them 💫",
  ];

  const prompts = type === 'morning' ? MORNING_PROMPTS : NIGHT_PROMPTS;
  const prompt = prompts[new Date().getDate() % prompts.length];

  const [msg, setMsg] = useState('');
  const [selectedMood, setSelectedMood] = useState('');

  const QUICK_MOODS = ['❤️', '😊', '😴', '😔', '🔥', '😂'];

  const handleSend = () => {
    if (!msg.trim() && !selectedMood) return;
    onAdd({
      uid: myUid,
      type,
      message: msg.trim() || selectedMood,
      mood: selectedMood || undefined,
      timestamp: new Date().toISOString(),
    });
    setMsg('');
    setSelectedMood('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        {type === 'morning' ? <Coffee size={16} className="text-amber-500" /> : <Moon size={16} className="text-indigo-400" />}
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {type === 'morning' ? 'Morning check-in' : 'Goodnight check-in'}
        </h3>
      </div>

      {partnerCheckIn && (
        <div className="mb-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm">
          <span className="text-xs font-bold text-slate-400 block mb-1">{partnerName} said:</span>
          <p className="text-slate-700 dark:text-slate-200">{partnerCheckIn.message}</p>
        </div>
      )}

      {alreadyCheckedIn ? (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
          <CheckCircle2 size={16} />
          <span>You've checked in for today!</span>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">{prompt}</p>
          <div className="flex gap-2 flex-wrap">
            {QUICK_MOODS.map(e => (
              <button
                key={e}
                onClick={() => setSelectedMood(e === selectedMood ? '' : e)}
                className={`text-xl p-1.5 rounded-xl transition-all ${selectedMood === e ? 'scale-125 bg-pink-50 dark:bg-pink-900/20' : 'opacity-60 hover:opacity-100'}`}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={msg}
              onChange={e => setMsg(e.target.value)}
              placeholder="Or write a message..."
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:border-pink-400 text-slate-800 dark:text-slate-100"
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={!msg.trim() && !selectedMood}
              className="px-3 py-2 bg-pink-500 text-white rounded-xl hover:bg-pink-600 disabled:opacity-40 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Shared Challenge ─────────────────────────────────────────────────────────

const SharedChallengeCard: React.FC<{
  challenge: SharedHabitChallenge;
  myUid: string;
  onToggle: (challengeId: string, date: string) => void;
}> = ({ challenge, myUid, onToggle }) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const start = new Date(challenge.startDate);
  const dayNum = differenceInDays(new Date(), start) + 1;
  const totalDays = challenge.durationDays;

  const myDone    = challenge.myProgress[today];
  const myTotal   = Object.values(challenge.myProgress).filter(Boolean).length;
  const themTotal = Object.values(challenge.partnerProgress).filter(Boolean).length;

  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return format(d, 'yyyy-MM-dd');
  });

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{challenge.icon}</span>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">{challenge.name}</p>
            <p className="text-[10px] text-slate-400">Day {Math.min(dayNum, totalDays)} of {totalDays}</p>
          </div>
        </div>
        <button
          onClick={() => onToggle(challenge.id, today)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
            ${myDone
              ? 'bg-green-100 dark:bg-green-900/30 text-green-500'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-pink-50 hover:text-pink-500'
            }`}
        >
          {myDone ? <CheckCircle2 size={22} /> : <Circle size={22} />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2 text-center">
          <p className="text-lg font-black text-slate-800 dark:text-white">{myTotal}</p>
          <p className="text-[10px] text-slate-400">Your days</p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2 text-center">
          <p className="text-lg font-black text-slate-800 dark:text-white">{themTotal}</p>
          <p className="text-[10px] text-slate-400">Their days</p>
        </div>
      </div>

      <div className="flex gap-0.5">
        {last14.map(d => (
          <div key={d} className="flex-1 flex flex-col gap-0.5">
            <div className={`h-2 rounded-full ${challenge.myProgress[d] ? 'opacity-100' : 'opacity-20'}`}
              style={{ backgroundColor: challenge.color }} />
            <div className={`h-2 rounded-full ${challenge.partnerProgress[d] ? 'opacity-60' : 'opacity-10'}`}
              style={{ backgroundColor: challenge.color }} />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-1 text-[9px] text-slate-400">
        <span>14 days ago</span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5">
            <div className="w-2 h-1 rounded-full" style={{ backgroundColor: challenge.color }} /> You
          </span>
          <span className="flex items-center gap-0.5">
            <div className="w-2 h-1 rounded-full opacity-60" style={{ backgroundColor: challenge.color }} /> Them
          </span>
        </div>
        <span>Today</span>
      </div>
    </div>
  );
};

// ─── Meetup Editor ────────────────────────────────────────────────────────────

const MeetupEditor: React.FC<{
  meetup?: CouplesMeetup;
  onSave: (meetup: CouplesMeetup) => void;
  onClose: () => void;
}> = ({ meetup, onSave, onClose }) => {
  const [title, setTitle]       = useState(meetup?.title || '');
  const [date, setDate]         = useState(meetup?.date ? meetup.date.substring(0, 16) : '');
  const [location, setLocation] = useState(meetup?.location || '');
  const [notes, setNotes]       = useState(meetup?.notes || '');

  const handleSave = () => {
    if (!title || !date) return;
    onSave({
      id: meetup?.id || Date.now().toString(),
      title,
      date: new Date(date).toISOString(),
      location: location || undefined,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-end justify-center">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-3xl p-5 pb-10 animate-slide-up space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Plane size={18} className="text-pink-500" /> Set your next meetup
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        {[
          { label: 'Title', value: title, onChange: setTitle, placeholder: 'e.g. Flying to you! ✈️' },
          { label: 'Location', value: location, onChange: setLocation, placeholder: 'City or place' },
          { label: 'Notes', value: notes, onChange: setNotes, placeholder: 'Any extra details...' },
        ].map(f => (
          <div key={f.label}>
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">{f.label}</label>
            <input
              value={f.value}
              onChange={e => f.onChange(e.target.value)}
              placeholder={f.placeholder}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-pink-400 text-slate-800 dark:text-slate-100"
            />
          </div>
        ))}
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Date & Time</label>
          <input
            type="datetime-local"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-pink-400 text-slate-800 dark:text-slate-100"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={!title || !date}
          className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold hover:from-pink-600 hover:to-rose-600 disabled:opacity-40 transition-all shadow-lg shadow-pink-200 dark:shadow-pink-900/30"
        >
          Save meetup
        </button>
      </div>
    </div>
  );
};

// ─── Main View ────────────────────────────────────────────────────────────────

type Tab = 'home' | 'photos' | 'journal' | 'challenges';

const CouplesView: React.FC<CouplesViewProps> = ({
  couplesData, onUpdateCouplesData, onLinkPartner, onUpdateHabits, onAddTask, onMenuClick, myUid, habits
}) => {
  const [activeTab, setActiveTab]       = useState<Tab>('home');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showMeetupEditor, setShowMeetupEditor] = useState(false);
  const [showPartnerLinkModal, setShowPartnerLinkModal] = useState(false);
  const [isLinkingPartner, setIsLinkingPartner] = useState(false);
  const [nudgeCount, setNudgeCount]     = useState(0);
  const [lastNudge, setLastNudge]       = useState<string | undefined>(undefined);

  const { myProfile, partnerProfile, photoWall, journal, checkIns, nextMeetup, sharedChallenges } = couplesData;

  const update = (partial: Partial<CouplesData>) =>
    onUpdateCouplesData({ ...couplesData, ...partial });

  const handleLinkPartner = async (inviteCode: string) => {
    setIsLinkingPartner(true);
    try {
      if (!onLinkPartner) {
        throw new Error('Partner linking callback not provided');
      }
      
      // Call the parent callback (App.tsx) with the invite code
      // This returns the coupleId if successful
      await onLinkPartner(inviteCode);
      
      // Close the modal after successful linking
      // Partner data will be fetched by App.tsx and passed back via props update
      setShowPartnerLinkModal(false);
    } catch (error) {
      alert(`Failed to link partner: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLinkingPartner(false);
    }
  };

  const handleNudge = () => {
    setNudgeCount(n => n + 1);
    setLastNudge(new Date().toISOString());
    // In production: call a Firebase Cloud Function to push notify partner
    if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
  };

  const handleStatusUpdate = (status: CoupleProfile['status'], message?: string) => {
    update({ myProfile: { ...myProfile, status, statusMessage: message } });
  };

  const handleAddPhoto = (photo: Omit<PhotoMoment, 'id'>) => {
    update({ photoWall: [...photoWall, { ...photo, id: Date.now().toString() }] });
  };

  const handleReact = (photoId: string, emoji: string) => {
    update({
      photoWall: photoWall.map(p =>
        p.id === photoId
          ? { ...p, reactions: [...(p.reactions || []), { uid: myUid, emoji }] }
          : p
      ),
    });
  };

  const handleAddJournal = (entry: Omit<JournalEntry, 'id'>) => {
    update({ journal: [...journal, { ...entry, id: Date.now().toString() }] });
  };

  const handleAddCheckIn = (checkIn: Omit<CheckIn, 'id'>) => {
    update({ checkIns: [...checkIns, { ...checkIn, id: Date.now().toString() }] });
  };

  const handleChallengeToggle = (challengeId: string, date: string) => {
    const challenge = sharedChallenges.find(c => c.id === challengeId);
    const cur = challenge?.myProgress[date];
    
    // Update challenge progress
    update({
      sharedChallenges: sharedChallenges.map(c => {
        if (c.id !== challengeId) return c;
        return { ...c, myProgress: { ...c.myProgress, [date]: !cur } };
      }),
    });
    
    // Also update the corresponding habit's history
    if (challenge && challenge.habitId && onUpdateHabits) {
      const habit = habits.find(h => h.id === challenge.habitId);
      if (habit) {
        const updatedHabit = {
          ...habit,
          history: {
            ...habit.history,
            [date]: {
              completed: !cur,
              timestamp: new Date(date).getTime(),
            },
          },
        };
        onUpdateHabits(habits.map(h => h.id === habit.id ? updatedHabit : h));
      }
    }
  };

  const partnerName = partnerProfile?.displayName.split(' ')[0] || 'Partner';

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'home',       icon: <Heart size={18} />,    label: 'Together'  },
    { id: 'photos',     icon: <Camera size={18} />,   label: 'Moments'   },
    { id: 'journal',    icon: <BookOpen size={18} />, label: 'Letters'   },
    { id: 'challenges', icon: <Target size={18} />,   label: 'Challenges'},
  ];

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="pt-safe bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button onClick={onMenuClick} className="p-1 -ml-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <ChevronLeft size={22} />
            </button>
            <div className="flex items-center gap-2">
              {partnerProfile && <Avatar profile={partnerProfile} size="sm" />}
              <div>
                <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  {partnerProfile ? `You & ${partnerName}` : 'Together'}
                </h1>
                {partnerProfile && (
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {getTimeInZone(partnerProfile.timezone)} their time
                  </p>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowStatusPicker(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[myProfile.status].color}`} />
            {STATUS_CONFIG[myProfile.status].label}
          </button>
          {!partnerProfile && (
            <button
              onClick={() => setShowPartnerLinkModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-full text-xs font-bold text-pink-600 dark:text-pink-300 hover:bg-pink-100 transition-colors"
            >
              <Heart size={14} />
              Link partner
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-t border-slate-100 dark:border-slate-800">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition-colors relative
                ${activeTab === tab.id
                  ? 'text-pink-500 dark:text-pink-400'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
            >
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-pink-500 rounded-full" />
              )}
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
        {activeTab === 'home' && (
          <div className="p-4 space-y-4">
            {/* Nudge + Status row */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 flex items-center justify-around">
              <NudgeButton
                partnerName={partnerName}
                onNudge={handleNudge}
                lastNudge={lastNudge}
              />
              <div className="w-px h-16 bg-slate-100 dark:bg-slate-800" />
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  {partnerProfile
                    ? <Avatar profile={partnerProfile} size="lg" />
                    : <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">💑</div>
                  }
                </div>
                <p className="text-xs text-slate-400 text-center">
                  {partnerProfile ? `${partnerName}'s status` : 'No partner linked'}
                </p>
                {partnerProfile && (
                  <span className={`text-xs font-bold ${STATUS_CONFIG[partnerProfile.status].text} ${STATUS_CONFIG[partnerProfile.status].dark}`}>
                    {STATUS_CONFIG[partnerProfile.status].label}
                  </span>
                )}
              </div>
            </div>

            {/* Dual clock */}
            <DualClock myProfile={myProfile} partnerProfile={partnerProfile} />

            {/* Smart call window */}
            {partnerProfile && (
              <SmartCallWindow myTz={myProfile.timezone} partnerTz={partnerProfile.timezone} />
            )}

            {/* Countdown */}
            <CountdownWidget meetup={nextMeetup} onEdit={() => setShowMeetupEditor(true)} />

            {/* Check-in */}
            <CheckInSection
              checkIns={checkIns}
              myUid={myUid}
              partnerName={partnerName}
              onAdd={handleAddCheckIn}
            />
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="p-4">
            <PhotoWall
              photos={photoWall}
              myUid={myUid}
              onAdd={handleAddPhoto}
              onReact={handleReact}
              partnerName={partnerName}
            />
          </div>
        )}

        {activeTab === 'journal' && (
          <div className="p-4">
            <JournalSection
              entries={journal}
              myUid={myUid}
              partnerName={partnerName}
              onAdd={handleAddJournal}
            />
          </div>
        )}

        {activeTab === 'challenges' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Shared challenges</h3>
              <button
                onClick={() => {
                  // Create a new habit for this challenge
                  const habitId = Date.now().toString();
                  const newHabit: Habit = {
                    id: habitId,
                    name: '30-day habit challenge',
                    icon: '🎯',
                    color: '#ec4899',
                    description: 'Shared challenge with partner',
                    frequencyType: 'daily',
                    section: 'Others',
                    startDate: new Date(),
                    endDate: new Date(Date.now() + (30 - 1) * 24 * 60 * 60 * 1000),
                    history: {},
                    isArchived: false,
                  };
                  
                  // Add habit to habits state
                  if (onUpdateHabits) {
                    onUpdateHabits([...habits, newHabit]);
                  }
                  
                  // Create the corresponding challenge
                  const newChallenge: SharedHabitChallenge = {
                    id: `challenge_${habitId}`,
                    habitId: habitId,
                    name: '30-day habit challenge',
                    icon: '🎯',
                    color: '#ec4899',
                    durationDays: 30,
                    startDate: new Date().toISOString(),
                    myProgress: {},
                    partnerProgress: {},
                  };
                  update({ sharedChallenges: [...sharedChallenges, newChallenge] });
                }}
                className="p-1.5 bg-pink-50 dark:bg-pink-900/20 text-pink-500 rounded-lg hover:bg-pink-100 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            {sharedChallenges.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Target size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No shared challenges yet</p>
                <p className="text-xs mt-1">Start a challenge together — tap + above</p>
              </div>
            ) : (
              sharedChallenges.map(c => (
                <SharedChallengeCard
                  key={c.id}
                  challenge={c}
                  myUid={myUid}
                  onToggle={handleChallengeToggle}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showPartnerLinkModal && (
        <PartnerLinkingModal
          onLink={handleLinkPartner}
          onClose={() => setShowPartnerLinkModal(false)}
          isLoading={isLinkingPartner}
        />
      )}
      {showStatusPicker && (
        <StatusPicker
          current={myProfile.status}
          message={myProfile.statusMessage}
          onUpdate={handleStatusUpdate}
          onClose={() => setShowStatusPicker(false)}
        />
      )}
      {showMeetupEditor && (
        <MeetupEditor
          meetup={nextMeetup}
          onSave={(meetup) => {
            update({ nextMeetup: meetup });
            
            // Also create/update a calendar event task
            if (onAddTask) {
              const eventTask: Task = {
                id: nextMeetup?.id || Date.now().toString(),
                title: `🗓️ ${meetup.title}`,
                description: `Meetup with ${partnerName}${meetup.location ? ` at ${meetup.location}` : ''}${meetup.notes ? `\n${meetup.notes}` : ''}`,
                dueDate: new Date(meetup.date),
                isEvent: true,
                location: meetup.location || undefined,
                createdDate: new Date(),
                lists: [],
                subtasks: [],
                tags: ['couples', 'meetup'],
                history: {},
              };
              onAddTask(eventTask);
            }
            
            setShowMeetupEditor(false);
          }}
          onClose={() => setShowMeetupEditor(false)}
        />
      )}
    </div>
  );
};

export default CouplesView;
