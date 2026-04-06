// ═══════════════════════════════════════════════════════════════════════════
// HabitsModule.tsx - Consolidated Habits Component
// Combines: HabitView, HabitDetailView, HabitFormSheet, HabitStatsView, 
//           HabitReminderSheet, HabitShareModal
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { Habit, HabitSection, HabitLog, HabitFrequencyType } from '../types';
import {
  Plus, BarChart2, Menu, Flame, Zap, Archive, Trash2,
  Edit3, Check, X, ChevronDown, ChevronUp, Target,
  Sun, Sunset, Moon, Star, Coffee, MoreVertical,
  TrendingUp, TrendingDown, Calendar, Filter,
  Search, Award, RefreshCw, Snowflake, Play,
  AlarmClock, BookOpen, SkipForward, Smile, Frown, Meh,
  ChevronLeft, ChevronRight, Share2, User, ExternalLink, Zap as ZapIcon, Heart, Clock, CheckCircle2, Circle, Activity, List, Grid3x3
} from 'lucide-react';
import { 
  format, subDays, isToday, parseISO, differenceInDays, startOfWeek, addDays,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, getDay, startOfToday, addWeeks
} from 'date-fns';
import { WheelPicker } from './WheelPicker';

// ─── Types ───────────────────────────────────────────────────────────────

interface HabitsModuleProps {
  habits: Habit[];
  onToggleHabit: (id: string, date: string) => void;
  onUpdateHabit: (habit: Habit) => void;
  onAddHabit: (habit: Habit) => void;
  onDeleteHabit: (id: string) => void;
  onMenuClick: () => void;
  onOpenStats?: () => void;
  onStartFocus?: (habitId: string) => void;
  setCurrentView?: (view: string) => void;
  onClose?: () => void;
  viewType?: 'main' | 'stats';
  user?: any;
}

type MoodType = 'great' | 'okay' | 'bad' | undefined;
type FilterType = 'all' | 'today' | 'streak' | 'negative';
type SortType = 'default' | 'streak' | 'name' | 'completion';
type ViewMode = 'grid' | 'list';
type Tab = 'Week' | 'Month' | 'Year' | 'Record';

// ─── Constants ───────────────────────────────────────────────────────────

const SECTIONS: HabitSection[] = ['Morning', 'Afternoon', 'Night', 'Others'];

const SECTION_META: Record<HabitSection, { icon: React.ReactNode; gradient: string; time: string }> = {
  Morning:   { icon: <Sun size={14} />,     gradient: 'from-amber-400 to-orange-400',   time: '5am – 12pm' },
  Afternoon: { icon: <Sunset size={14} />,  gradient: 'from-sky-400 to-blue-500',       time: '12pm – 5pm' },
  Night:     { icon: <Moon size={14} />,    gradient: 'from-indigo-500 to-violet-600',  time: '5pm – 10pm' },
  Others:    { icon: <Star size={14} />,    gradient: 'from-slate-400 to-slate-600',    time: 'Anytime'    },
};

const ICON_OPTIONS = ['💪','🏃','📚','💧','🧘','🎯','🌿','🎨','🎵','💤','🍎','🧠','✍️','🏋️','🚴','🧹','💊','🌅','🦷','🛁','👁','📵','🚶','🍵','🥗'];
const COLOR_OPTIONS = ['#6366f1','#8b5cf6','#ec4899','#f97316','#eab308','#22c55e','#14b8a6','#3b82f6','#ef4444','#06b6d4'];
const MOOD_OPTIONS: { value: MoodType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'great', label: 'Great',  icon: <Smile size={16} />, color: 'text-green-500'  },
  { value: 'okay',  label: 'Okay',   icon: <Meh   size={16} />, color: 'text-yellow-500' },
  { value: 'bad',   label: 'Bad',    icon: <Frown size={16} />, color: 'text-red-500'    },
];

const CATEGORIES: Record<string, { name: string, icon: string, quote: string, color: string }[]> = {
    'Suggested': [
        { name: 'Drink water', icon: '💧', quote: 'Stay moisturized', color: '#3b82f6' },
        { name: 'Eat fruits', icon: '🍌', quote: 'Stay healthier, stay happier', color: '#84cc16' },
        { name: 'Early to rise', icon: '☀️', quote: 'Get up and be amazing', color: '#facc15' },
        { name: 'Read', icon: '📘', quote: 'A chapter a day lights your way', color: '#3b82f6' },
        { name: 'Meditate', icon: '🧘', quote: 'Find your inner peace', color: '#10b981' },
    ],
    'Health': [
        { name: 'No sugar', icon: '🚫', quote: 'Sweet enough already', color: '#ef4444' },
        { name: 'Take vitamins', icon: '💊', quote: 'Boost your health', color: '#facc15' },
        { name: 'Sleep 8 hours', icon: '😴', quote: 'Rest and recharge', color: '#6366f1' },
        { name: 'Walk', icon: '🚶', quote: 'Keep moving', color: '#10b981' },
    ]
};

const UNITS = ['Count', 'Cup', 'Milliliter', 'Minute', 'Hour', 'Kilometer', 'Page', 'Custom Unit'];
const SECTIONS_ARRAY: HabitSection[] = ['Morning', 'Afternoon', 'Night', 'Others'];
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ─── Helper Functions ────────────────────────────────────────────────────

const todayStr = () => format(new Date(), 'yyyy-MM-dd');

function getStreak(habit: Habit): number {
  let streak = 0;
  let d = new Date();
  while (true) {
    const key = format(d, 'yyyy-MM-dd');
    if (habit.history[key]?.completed) { streak++; d = subDays(d, 1); }
    else break;
  }
  return streak;
}

function getLongestStreak(habit: Habit): number {
  const dates = Object.entries(habit.history)
    .filter(([, v]) => v.completed)
    .map(([k]) => k)
    .sort();
  if (!dates.length) return 0;
  let max = 1, curr = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = differenceInDays(parseISO(dates[i]), parseISO(dates[i - 1]));
    if (diff === 1) { curr++; max = Math.max(max, curr); }
    else curr = 1;
  }
  return max;
}

function getCompletionRate(habit: Habit, days = 30): number {
  let done = 0;
  for (let i = 0; i < days; i++) {
    const key = format(subDays(new Date(), i), 'yyyy-MM-dd');
    if (habit.history[key]?.completed) done++;
  }
  return Math.round((done / days) * 100);
}

function getLast7(habit: Habit): { date: string; done: boolean; mood?: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const key = format(d, 'yyyy-MM-dd');
    return { date: key, done: !!habit.history[key]?.completed, mood: habit.history[key]?.mood };
  });
}

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const subMonths = (date: Date, n: number) => addMonths(date, -n);
const subWeeks = (date: Date, n: number) => addWeeks(date, -n);
const startOfWeekHelper = (date: Date, options?: { weekStartsOn?: number }) => {
    const day = getDay(date);
    const startDay = options?.weekStartsOn || 0;
    const diff = (day < startDay ? 7 : 0) + day - startDay;
    return addDays(date, -diff);
};
const endOfWeekHelper = (date: Date, options?: { weekStartsOn?: number }) => {
    const start = startOfWeekHelper(date, options);
    return addDays(start, 6);
};

// ─── Sub-Components ──────────────────────────────────────────────────────

const StatPill: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color = 'text-indigo-600 dark:text-indigo-400' }) => (
  <div className="flex flex-col items-center bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2 min-w-[56px]">
    <span className={`text-base font-bold ${color}`}>{value}</span>
    <span className="text-[10px] text-slate-400 mt-0.5 text-center leading-tight">{label}</span>
  </div>
);

const MiniDots: React.FC<{ habit: Habit }> = ({ habit }) => {
  const days = getLast7(habit);
  return (
    <div className="flex gap-1 items-center">
      {days.map((d, i) => (
        <div key={i} title={d.date}
          className={`w-2.5 h-2.5 rounded-full transition-all ${
            d.done
              ? d.mood === 'great' ? 'bg-green-500' : d.mood === 'bad' ? 'bg-red-400' : 'bg-indigo-500'
              : isToday(parseISO(d.date)) ? 'bg-slate-200 dark:bg-white/10 ring-2 ring-indigo-400' : 'bg-slate-200 dark:bg-white/10'
          }`}
        />
      ))}
    </div>
  );
};

const HabitModal: React.FC<{
  habit?: Habit;
  onSave: (h: Habit) => void;
  onClose: () => void;
}> = ({ habit, onSave, onClose }) => {
  const isEdit = !!habit;
  const [name, setName]             = useState(habit?.name || '');
  const [icon, setIcon]             = useState(habit?.icon || '💪');
  const [color, setColor]           = useState(habit?.color || '#6366f1');
  const [description, setDesc]      = useState(habit?.description || '');
  const [quote, setQuote]           = useState(habit?.quote || '');
  const [section, setSection]       = useState<HabitSection>(habit?.section || 'Morning');
  const [freqType, setFreqType]     = useState(habit?.frequencyType || 'daily');
  const [freqDays, setFreqDays]     = useState<number[]>(habit?.frequencyDays || []);
  const [goal, setGoal]             = useState(habit?.goal ?? 1);
  const [unit, setUnit]             = useState(habit?.unit || '');
  const [targetValue, setTargetVal] = useState(habit?.targetValue ?? 1);
  const [isNegative, setIsNeg]      = useState(habit?.isNegative || false);
  const [reminder, setReminder]     = useState(habit?.reminders?.[0] || '');
  const [routine, setRoutine]       = useState(habit?.routine || '');

  const DAYS_SHORT = ['Su','Mo','Tu','We','Th','Fr','Sa'];

  const handleSave = () => {
    if (!name.trim()) return;
    const base = habit || {
      id: Date.now().toString(),
      history: {},
      createdDate: new Date(),
    };
    onSave({
      ...base,
      name: name.trim(),
      icon, color, description, quote, section,
      frequencyType: freqType as Habit['frequencyType'],
      frequencyDays: freqType === 'specific_days' ? freqDays : undefined,
      goal, unit, targetValue, isNegative, routine,
      reminders: reminder ? [reminder] : [],
      updatedAt: new Date(),
    } as Habit);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up custom-scrollbar">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100 dark:border-white/5 sticky top-0 bg-white dark:bg-slate-900 z-10 rounded-t-3xl">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">{isEdit ? 'Edit Habit' : 'New Habit'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"><X size={18} /></button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <div className="flex gap-3 items-center">
            <div className="text-3xl w-14 h-14 flex items-center justify-center bg-slate-50 dark:bg-white/5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10">{icon}</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Habit name…"
              className="flex-1 text-base font-semibold bg-transparent border-b-2 border-slate-200 dark:border-white/10 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none py-1 text-slate-800 dark:text-white placeholder-slate-300 transition-colors" />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Icon</p>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map(ic => (
                <button key={ic} onClick={() => setIcon(ic)}
                  className={`text-xl w-9 h-9 rounded-xl transition-all ${icon === ic ? 'bg-indigo-100 dark:bg-indigo-500/20 ring-2 ring-indigo-500 scale-110' : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Color</p>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 ring-current scale-110' : ''}`} />
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Section</p>
            <div className="grid grid-cols-4 gap-2">
              {SECTIONS_ARRAY.map(s => (
                <button key={s} onClick={() => setSection(s)}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-0.5 ${section === s ? 'bg-indigo-500 text-white' : 'bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                  {SECTION_META[s].icon}
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Frequency</p>
            <div className="flex gap-2 flex-wrap">
              {(['daily','weekly','specific_days','interval'] as const).map(ft => (
                <button key={ft} onClick={() => setFreqType(ft)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${freqType === ft ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300'}`}>
                  {ft.replace('_', ' ')}
                </button>
              ))}
            </div>
            {freqType === 'specific_days' && (
              <div className="flex gap-1.5 mt-3">
                {DAYS_SHORT.map((d, i) => (
                  <button key={i} onClick={() => setFreqDays(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])}
                    className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${freqDays.includes(i) ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500'}`}>
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Daily Goal</p>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2">
                <button onClick={() => setGoal(Math.max(1, goal - 1))} className="text-slate-400 hover:text-slate-600 font-bold">−</button>
                <span className="flex-1 text-center font-bold text-slate-800 dark:text-white">{goal}</span>
                <button onClick={() => setGoal(goal + 1)} className="text-slate-400 hover:text-slate-600 font-bold">+</button>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Unit</p>
              <input value={unit} onChange={e => setUnit(e.target.value)} placeholder="times, mins…"
                className="w-full bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white outline-none placeholder-slate-300" />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-500/10 rounded-2xl">
            <div>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">Habit to Break 🚫</p>
              <p className="text-xs text-red-400 mt-0.5">Track days you avoided this</p>
            </div>
            <button onClick={() => setIsNeg(!isNegative)}
              className={`w-10 h-6 rounded-full transition-colors ${isNegative ? 'bg-red-500' : 'bg-slate-200 dark:bg-white/10'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${isNegative ? 'translate-x-4' : ''}`} />
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Reminder</p>
            <input type="time" value={reminder} onChange={e => setReminder(e.target.value)}
              className="bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white outline-none" />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Why this habit?</p>
            <textarea value={description} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Your motivation…"
              className="w-full bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white outline-none resize-none placeholder-slate-300" />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Motivational Quote</p>
            <input value={quote} onChange={e => setQuote(e.target.value)} placeholder="Add a mantra…"
              className="w-full bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white outline-none placeholder-slate-300" />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Routine Group</p>
            <input value={routine} onChange={e => setRoutine(e.target.value)} placeholder="e.g. Morning Power, Deep Work…"
              className="w-full bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white outline-none placeholder-slate-300" />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-slate-900 px-5 pb-5 pt-3 border-t border-slate-100 dark:border-white/5 rounded-b-3xl flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="flex-1 py-3 rounded-2xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-colors disabled:opacity-40">
            {isEdit ? 'Save Changes' : 'Create Habit'}
          </button>
        </div>
      </div>
    </div>
  );
};

const LogModal: React.FC<{
  habit: Habit;
  date: string;
  onLog: (mood: MoodType, note: string, skip: boolean, skipReason: string) => void;
  onClose: () => void;
}> = ({ habit, date, onLog, onClose }) => {
  const existing = habit.history[date];
  const [mood, setMood] = useState<MoodType>(existing?.mood as MoodType);
  const [note, setNote] = useState(existing?.note || '');
  const [skip, setSkip] = useState(false);
  const [skipReason, setSkipReason] = useState(existing?.skipReason || '');

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl animate-slide-up p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{habit.icon}</span>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">{habit.name}</h3>
            <p className="text-xs text-slate-400">{format(parseISO(date), 'MMM d, yyyy')}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">How did it feel?</p>
          <div className="flex gap-3">
            {MOOD_OPTIONS.map(m => (
              <button key={m.value} onClick={() => setMood(mood === m.value ? undefined : m.value)}
                className={`flex-1 flex flex-col items-center py-2.5 rounded-2xl border-2 transition-all gap-1 ${mood === m.value ? 'border-current bg-slate-50 dark:bg-white/10 ' + m.color : 'border-slate-100 dark:border-white/10 text-slate-400'}`}>
                {m.icon}
                <span className="text-[10px] font-semibold">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Note (optional)</p>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="What went well or hard?"
            className="w-full bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white outline-none resize-none placeholder-slate-300" />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={skip} onChange={e => setSkip(e.target.checked)} className="w-4 h-4 rounded accent-indigo-500" />
            <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">Skip today <span className="text-xs text-slate-400">(won't break streak)</span></span>
          </label>
          {skip && (
            <input value={skipReason} onChange={e => setSkipReason(e.target.value)} placeholder="Reason (travel, sick…)"
              className="mt-2 w-full bg-slate-50 dark:bg-white/5 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white outline-none placeholder-slate-300" />
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl border-2 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={() => { onLog(mood, note, skip, skipReason); onClose(); }}
            className="flex-1 py-3 rounded-2xl bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-colors">
            {skip ? 'Skip Day' : 'Log Entry'}
          </button>
        </div>
      </div>
    </div>
  );
};

const HabitCard: React.FC<{
  habit: Habit;
  viewMode: ViewMode;
  onToggle: (id: string, date: string) => void;
  onEdit: (h: Habit) => void;
  onDelete: (id: string) => void;
  onStartFocus: (id: string) => void;
  onLog: (h: Habit) => void;
}> = ({ habit, viewMode, onToggle, onEdit, onDelete, onStartFocus, onLog }) => {
  const [showMenu, setShowMenu] = useState(false);
  const today = todayStr();
  const isDone = !!habit.history[today]?.completed;
  const streak = getStreak(habit);
  const rate = getCompletionRate(habit);
  const last7 = getLast7(habit);

  const handleCheck = () => {
    if (!isDone) {
      onLog(habit);
    } else {
      onToggle(habit.id, today);
    }
  };

  if (viewMode === 'list') {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all animate-fade-in ${isDone ? 'bg-slate-50 dark:bg-white/3 border-slate-100 dark:border-white/5 opacity-80' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/10 hover:border-indigo-200 dark:hover:border-indigo-500/30'}`}>
        <button onClick={handleCheck}
          style={{ borderColor: isDone ? habit.color : undefined, backgroundColor: isDone ? habit.color : undefined }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 flex-shrink-0 transition-all ${isDone ? 'text-white scale-110' : 'border-slate-200 dark:border-white/20 hover:scale-105'}`}>
          {isDone ? <Check size={16} /> : <span className="text-lg">{habit.icon}</span>}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>{habit.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <MiniDots habit={habit} />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {streak > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-2 py-0.5 rounded-full">
              🔥{streak}
            </span>
          )}
          <button onClick={() => setShowMenu(!showMenu)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 relative">
            <MoreVertical size={15} />
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/10 rounded-2xl shadow-xl z-30 w-44 py-1 text-left"
                onBlur={() => setShowMenu(false)}>
                <button onClick={() => { onEdit(habit); setShowMenu(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"><Edit3 size={13} /> Edit</button>
                <button onClick={() => { onStartFocus(habit.id); setShowMenu(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"><Play size={13} /> Focus Mode</button>
                <button onClick={() => { onDelete(habit.id); setShowMenu(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={13} /> Archive</button>
              </div>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-3xl border p-4 flex flex-col gap-3 transition-all animate-scale-in bento-card ${isDone ? 'opacity-80 bg-slate-50 dark:bg-white/3 border-slate-100 dark:border-white/5' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-white/10 hover:border-indigo-200 dark:hover:border-indigo-500/30'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div style={{ backgroundColor: habit.color + '20' }}
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0">
            {habit.icon}
          </div>
          <div>
            <p className={`text-sm font-bold leading-tight ${isDone ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>{habit.name}</p>
            {habit.quote && <p className="text-[10px] text-slate-400 truncate max-w-[120px] italic mt-0.5">"{habit.quote}"</p>}
          </div>
        </div>
        <button onClick={() => setShowMenu(!showMenu)} className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 relative mt-0.5">
          <MoreVertical size={15} />
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/10 rounded-2xl shadow-xl z-30 w-44 py-1 text-left"
              onBlur={() => setShowMenu(false)}>
              <button onClick={() => { onEdit(habit); setShowMenu(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"><Edit3 size={13} /> Edit</button>
              <button onClick={() => { onStartFocus(habit.id); setShowMenu(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"><Play size={13} /> Focus Mode</button>
              <button onClick={() => { onDelete(habit.id); setShowMenu(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><Trash2 size={13} /> Archive</button>
            </div>
          )}
        </button>
      </div>

      <MiniDots habit={habit} />

      <div className="flex gap-2">
        <StatPill label="Streak" value={`${streak}🔥`} color="text-orange-500" />
        <StatPill label="30d Rate" value={`${rate}%`} color={rate >= 70 ? 'text-green-500' : rate >= 40 ? 'text-yellow-500' : 'text-red-400'} />
        {habit.isNegative && <StatPill label="Type" value="🚫" color="text-red-400" />}
      </div>

      {!habit.isNegative && (
        <div className="w-full h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
          <div style={{ width: `${rate}%`, backgroundColor: habit.color }} className="h-full rounded-full transition-all duration-700" />
        </div>
      )}

      <button onClick={handleCheck}
        style={isDone ? { backgroundColor: habit.color, borderColor: habit.color } : { borderColor: habit.color + '50' }}
        className={`w-full py-2.5 rounded-2xl border-2 flex items-center justify-center gap-2 font-semibold text-sm transition-all ${isDone ? 'text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
        {isDone ? <><Check size={15} /> Done!</> : <><span>{habit.icon}</span> Mark Done</>}
      </button>
    </div>
  );
};

const WeeklyStrip: React.FC<{ habits: Habit[] }> = ({ habits }) => {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(new Date(), 6 - i);
    const key = format(d, 'yyyy-MM-dd');
    const done = habits.filter(h => !h.isArchived && h.history[key]?.completed).length;
    return { label: format(d, 'EEE'), key, done, total: habits.filter(h => !h.isArchived).length, isToday: isToday(d) };
  });

  return (
    <div className="grid grid-cols-7 gap-1.5 px-4 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5">
      {days.map(d => {
        const pct = d.total ? (d.done / d.total) * 100 : 0;
        return (
          <div key={d.key} className={`flex flex-col items-center gap-1 ${d.isToday ? 'opacity-100' : 'opacity-70'}`}>
            <span className={`text-[10px] font-semibold ${d.isToday ? 'text-indigo-500' : 'text-slate-400'}`}>{d.label}</span>
            <div className="w-full h-14 bg-slate-100 dark:bg-white/5 rounded-lg relative overflow-hidden">
              <div style={{ height: `${pct}%`, backgroundColor: d.isToday ? '#6366f1' : '#94a3b8' }}
                className="absolute bottom-0 left-0 right-0 rounded-lg transition-all duration-700" />
            </div>
            <span className={`text-[10px] font-bold ${d.isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>{d.done}/{d.total}</span>
          </div>
        );
      })}
    </div>
  );
};

const SummaryBanner: React.FC<{ habits: Habit[] }> = ({ habits }) => {
  const today = todayStr();
  const active = habits.filter(h => !h.isArchived);
  const doneToday = active.filter(h => h.history[today]?.completed).length;
  const totalToday = active.length;
  const bestStreak = Math.max(0, ...active.map(getStreak));
  const pct = totalToday ? Math.round((doneToday / totalToday) * 100) : 0;
  const allDone = doneToday === totalToday && totalToday > 0;

  return (
    <div className={`mx-4 mt-4 rounded-3xl p-4 flex items-center gap-4 ${allDone ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-violet-600'}`}>
      <div className="flex-1">
        <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Today's Progress</p>
        <p className="text-white text-2xl font-bold mt-0.5">{doneToday} / {totalToday} <span className="text-base font-medium">habits</span></p>
        <div className="h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden">
          <div style={{ width: `${pct}%` }} className="h-full bg-white rounded-full transition-all duration-700" />
        </div>
        {allDone && <p className="text-white text-xs font-semibold mt-1.5">🎉 Perfect day! All habits done!</p>}
      </div>
      <div className="text-center">
        <p className="text-white/70 text-[10px] font-semibold uppercase tracking-wider">Best Streak</p>
        <p className="text-white text-2xl font-bold">🔥{bestStreak}</p>
      </div>
    </div>
  );
};

// ─── Main HabitsModule Component ──────────────────────────────────────────

const HabitsModule: React.FC<HabitsModuleProps> = ({
  habits, onToggleHabit, onUpdateHabit, onAddHabit, onDeleteHabit,
  onMenuClick, onOpenStats, onStartFocus, setCurrentView, onClose, viewType = 'main', user
}) => {
  const [showAddModal, setShowAddModal]   = useState(false);
  const [editingHabit, setEditingHabit]   = useState<Habit | undefined>();
  const [loggingHabit, setLoggingHabit]   = useState<Habit | undefined>();
  const [filter, setFilter]               = useState<FilterType>('all');
  const [sort, setSort]                   = useState<SortType>('default');
  const [viewMode, setViewMode]           = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery]     = useState('');
  const [collapsedSections, setCollapsed] = useState<Set<string>>(new Set());
  const [showArchivedHabits, setShowArchived] = useState(false);
  const [activeStatsTab, setActiveStatsTab] = useState<'Week' | 'Month' | 'Year' | 'Record'>('Month');
  const [currentStatsDate, setCurrentStatsDate] = useState(new Date());

  const today = todayStr();
  const active = habits.filter(h => !h.isArchived);
  const archived = habits.filter(h => h.isArchived);

  const filtered = useMemo(() => {
    let list = active;
    if (searchQuery) list = list.filter(h => h.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filter === 'today')    list = list.filter(h => !h.history[today]?.completed);
    if (filter === 'streak')   list = list.filter(h => getStreak(h) > 0);
    if (filter === 'negative') list = list.filter(h => h.isNegative);

    if (sort === 'streak')     list = [...list].sort((a, b) => getStreak(b) - getStreak(a));
    if (sort === 'name')       list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'completion') list = [...list].sort((a, b) => getCompletionRate(b) - getCompletionRate(a));

    return list;
  }, [active, filter, sort, searchQuery, today]);

  const grouped = useMemo(() => {
    const map: Record<HabitSection, Habit[]> = { Morning: [], Afternoon: [], Night: [], Others: [] };
    filtered.forEach(h => map[h.section || 'Others'].push(h));
    return map;
  }, [filtered]);

  const toggleSection = (s: string) => setCollapsed(prev => {
    const next = new Set(prev);
    next.has(s) ? next.delete(s) : next.add(s);
    return next;
  });

  const handleLog = (habit: Habit, mood: MoodType, note: string, skip: boolean, skipReason: string) => {
    const key = today;
    const newHistory = { ...habit.history };
    if (skip) {
      newHistory[key] = { completed: false, timestamp: Date.now(), skipReason, mood: mood || undefined };
    } else {
      newHistory[key] = { completed: true, timestamp: Date.now(), mood: mood || undefined, note: note || undefined };
    }
    onUpdateHabit({ ...habit, history: newHistory, updatedAt: new Date() });
  };

  // Show stats view if viewType is 'stats'
  if (viewType === 'stats') {
    const activeHabits = habits.filter(h => !h.isArchived);

    return (
      <div className="flex-1 h-full flex flex-col bg-slate-50 dark:bg-[#0f0f1a] overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 shrink-0 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-white/5">
          {onClose && (
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
              <X size={24} />
            </button>
          )}
          <div className="flex gap-2">
            {(['Week', 'Month', 'Year', 'Record'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveStatsTab(tab)}
                className={`px-4 py-1 text-xs font-bold rounded-md transition-colors ${activeStatsTab === tab ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
            <Share2 size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-center py-10 text-slate-400">
            <p>Stats view for {activeStatsTab} - {activeHabits.length} habits tracked</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0f0f1a] overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 md:pt-6 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-white/5">
        <button onClick={onMenuClick} className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">
          <Menu size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">Habits</h1>
          <p className="text-xs text-slate-400 mt-0.5">{format(new Date(), 'EEEE, MMM d')}</p>
        </div>
        <button 
          onClick={onOpenStats}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-500 transition-colors" 
          title="Stats">
          <BarChart2 size={20} />
        </button>
        <button onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
          {viewMode === 'grid' ? <BookOpen size={18} /> : <Target size={18} />}
        </button>
        <button onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-2xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-200 dark:shadow-none">
          <Plus size={16} /> Add
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <SummaryBanner habits={habits} />

        <div className="px-4 mt-3">
          <WeeklyStrip habits={habits} />
        </div>

        <div className="px-4 mt-3 space-y-2">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-2xl px-3 py-2">
            <Search size={15} className="text-slate-400 flex-shrink-0" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search habits…"
              className="flex-1 bg-transparent text-sm text-slate-800 dark:text-white outline-none placeholder-slate-400" />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {([['all','All'],['today','Pending'],['streak','On Streak'],['negative','Break Habits']] as [FilterType,string][]).map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${filter === f ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10'}`}>
                {label}
              </button>
            ))}
            <div className="w-px bg-slate-200 dark:bg-white/10 mx-1 flex-shrink-0" />
            {([['default','Default'],['streak','Streak'],['name','Name'],['completion','Completion']] as [SortType,string][]).map(([s, label]) => (
              <button key={s} onClick={() => setSort(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${sort === s ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10'}`}>
                ↕ {label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 mt-4 pb-32 space-y-6">
          {SECTIONS_ARRAY.map(section => {
            const sectionHabits = grouped[section];
            if (!sectionHabits.length) return null;
            const meta = SECTION_META[section];
            const isCollapsed = collapsedSections.has(section);
            const doneCnt = sectionHabits.filter(h => h.history[today]?.completed).length;

            return (
              <div key={section}>
                <button onClick={() => toggleSection(section)}
                  className="w-full flex items-center gap-2 mb-3 group">
                  <div className={`flex items-center gap-1.5 bg-gradient-to-r ${meta.gradient} text-white px-3 py-1 rounded-full text-xs font-bold`}>
                    {meta.icon} {section}
                  </div>
                  <span className="text-xs text-slate-400">{meta.time}</span>
                  <span className="ml-auto text-xs font-semibold text-slate-400">
                    {doneCnt}/{sectionHabits.length}
                  </span>
                  {isCollapsed ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
                </button>

                {!isCollapsed && (
                  viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 gap-3">
                      {sectionHabits.map(h => (
                        <HabitCard key={h.id} habit={h} viewMode="grid"
                          onToggle={onToggleHabit}
                          onEdit={setEditingHabit}
                          onDelete={onDeleteHabit}
                          onStartFocus={() => {}}
                          onLog={setLoggingHabit}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {sectionHabits.map(h => (
                        <HabitCard key={h.id} habit={h} viewMode="list"
                          onToggle={onToggleHabit}
                          onEdit={setEditingHabit}
                          onDelete={onDeleteHabit}
                          onStartFocus={() => {}}
                          onLog={setLoggingHabit}
                        />
                      ))}
                    </div>
                  )
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="text-5xl">🌱</div>
              <p className="text-slate-500 dark:text-slate-400 font-semibold">No habits found</p>
              <p className="text-slate-400 text-sm text-center">Start building your routine by adding a habit</p>
              <button onClick={() => setShowAddModal(true)} className="mt-2 px-5 py-2.5 bg-indigo-500 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-600 transition-colors">
                + Add Habit
              </button>
            </div>
          )}

          {archived.length > 0 && (
            <div>
              <button onClick={() => setShowArchived(!showArchivedHabits)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-semibold mb-3 transition-colors">
                <Archive size={15} />
                Archived ({archived.length})
                {showArchivedHabits ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showArchivedHabits && (
                <div className="space-y-2">
                  {archived.map(h => (
                    <div key={h.id} className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-white/5 opacity-60">
                      <span className="text-xl">{h.icon}</span>
                      <span className="text-sm text-slate-500 flex-1">{h.name}</span>
                      <button onClick={() => onUpdateHabit({ ...h, isArchived: false, updatedAt: new Date() })}
                        className="text-xs text-indigo-500 hover:text-indigo-600 font-semibold flex items-center gap-1">
                        <RefreshCw size={12} /> Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {(showAddModal || editingHabit) && (
        <HabitModal
          habit={editingHabit}
          onSave={(h) => {
            if (editingHabit) onUpdateHabit(h);
            else onAddHabit(h);
            setEditingHabit(undefined);
            setShowAddModal(false);
          }}
          onClose={() => { setEditingHabit(undefined); setShowAddModal(false); }}
        />
      )}
      {loggingHabit && (
        <LogModal
          habit={loggingHabit}
          date={today}
          onLog={(mood, note, skip, skipReason) => handleLog(loggingHabit, mood, note, skip, skipReason)}
          onClose={() => setLoggingHabit(undefined)}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HABIT VIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface HabitViewComponentProps {
  habits: Habit[];
  onToggleHabit: (id: string, date: string) => void;
  onUpdateHabit: (habit: Habit) => void;
  onAddHabit: (habit: Habit) => void;
  onDeleteHabit: (id: string) => void;
  onMenuClick: () => void;
  onOpenStats?: () => void;
  onStartFocus?: (habitId: string) => void;
  user?: any;
}

const HabitViewComponent: React.FC<HabitViewComponentProps> = ({
  habits,
  onToggleHabit,
  onUpdateHabit,
  onAddHabit,
  onDeleteHabit,
  onMenuClick,
  onOpenStats,
  onStartFocus,
  user
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | undefined>();
  const [loggingHabit, setLoggingHabit] = useState<Habit | undefined>();
  const [filterSection, setFilterSection] = useState<HabitSection | null>(null);

  const today = todayStr();
  const activeHabits = habits.filter(h => !h.isArchived);
  const groupedBySection = useMemo(() => {
    const grouped: Record<HabitSection, Habit[]> = {
      Morning: [],
      Afternoon: [],
      Night: [],
      Others: []
    };
    activeHabits.forEach(h => {
      const section = h.section || 'Others';
      grouped[section].push(h);
    });
    return grouped;
  }, [activeHabits]);

  const handleLog = (habit: Habit, mood: string | undefined, note: string, skip: boolean, skipReason: string) => {
    const newHistory = { ...habit.history };
    if (skip) {
      newHistory[today] = { completed: false, timestamp: Date.now(), reason: skipReason };
    } else {
      newHistory[today] = { completed: true, timestamp: Date.now(), mood, note };
    }
    onUpdateHabit({ ...habit, history: newHistory });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-slate-400">
            <Menu size={20} />
          </button>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Habits</h1>
        </div>
        <div className="flex items-center gap2">
          {onOpenStats && (
            <button onClick={onOpenStats} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-slate-400">
              <BarChart2 size={20} />
            </button>
          )}
          <button onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg text-slate-600 dark:text-slate-400">
            {viewMode === 'grid' ? <List size={20} /> : <Grid3x3 size={20} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {activeHabits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="text-5xl">🌱</div>
            <p className="text-slate-500 dark:text-slate-400 font-semibold">No habits found</p>
            <button onClick={() => setShowAddModal(true)} className="mt-2 px-5 py-2.5 bg-indigo-500 text-white rounded-2xl text-sm font-semibold hover:bg-indigo-600">
              + Add Habit
            </button>
          </div>
        ) : (
          Object.entries(groupedBySection).map(([section, sectionHabits]) => (
            sectionHabits.length > 0 && (
              <div key={section}>
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  {SECTION_META[section as HabitSection].icon}
                  {section}
                </h2>
                <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-2'}>
                  {sectionHabits.map(habit => (
                    <HabitCard
                      key={habit.id}
                      habit={habit}
                      viewMode={viewMode}
                      onToggle={onToggleHabit}
                      onEdit={setEditingHabit}
                      onDelete={onDeleteHabit}
                      onStartFocus={onStartFocus || (() => {})}
                      onLog={setLoggingHabit}
                    />
                  ))}
                </div>
              </div>
            )
          ))
        )}
      </div>

      {/* Add Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-indigo-500 text-white shadow-lg hover:bg-indigo-600 flex items-center justify-center z-40"
      >
        <Plus size={24} />
      </button>

      {/* Modals */}
      {showAddModal && (
        <HabitModal
          onSave={(h) => { onAddHabit(h); setShowAddModal(false); }}
          onClose={() => setShowAddModal(false)}
        />
      )}
      {editingHabit && (
        <HabitModal
          habit={editingHabit}
          onSave={onUpdateHabit}
          onClose={() => setEditingHabit(undefined)}
        />
      )}
      {loggingHabit && (
        <LogModal
          habit={loggingHabit}
          date={today}
          onLog={(mood, note, skip, skipReason) => handleLog(loggingHabit, mood, note, skip, skipReason)}
          onClose={() => setLoggingHabit(undefined)}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// HABIT STATS VIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface HabitStatsViewComponentProps {
  habits: Habit[];
  onClose?: () => void;
}

const HabitStatsViewComponent: React.FC<HabitStatsViewComponentProps> = ({ habits, onClose }) => {
  const [activeTab, setActiveTab] = useState<'Week' | 'Month' | 'Year' | 'Record'>('Month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const activeHabits = habits.filter(h => !h.isArchived);

  return (
    <div className="flex-1 h-full flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-4 shrink-0 bg-white border-b border-slate-200 shadow-sm">
        {onClose && (
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800">
            <X size={24} />
          </button>
        )}
        <div className="flex gap-2">
          {(['Week', 'Month', 'Year', 'Record'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1 text-xs font-bold rounded-md transition-colors ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <button className="p-2 text-slate-500 hover:text-slate-800">
          <Share2 size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-center py-10 text-slate-400">
          <p>Stats view for {activeTab} - {activeHabits.length} habits tracked</p>
        </div>
      </div>
    </div>
  );
};

export { 
  HabitsModule,
  HabitStatsViewComponent, 
  HabitCard,
  getStreak,
  getCompletionRate,
  getLongestStreak,
  getLast7
};

export default HabitsModule;
