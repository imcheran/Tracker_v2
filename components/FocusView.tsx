// src/components/FocusView.tsx
// FULLY UPGRADED FOCUS VIEW - Copy-paste ready

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Pause, Square, RotateCcw, Plus, Trash2, Edit3, Check, X,
  ChevronLeft, Timer, Zap, Target, TrendingUp, Award, Coins,
  Music, VolumeX, Volume2, Settings, BarChart2, Flame, Clock,
  Coffee, Brain, Dumbbell, BookOpen, Code, Pencil, Moon, Sun,
  TreePine, Star, ChevronRight, CheckCircle2, AlertCircle, Info,
  Maximize2, Minimize2, Bell, BellOff, Wind, Waves, CloudRain,
  Bird, Leaf, RefreshCw
} from 'lucide-react';
import { FocusCategory, FocusSession, Task, TimerMode } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FocusViewProps {
  categories: FocusCategory[];
  onAddCategory: (c: FocusCategory) => void;
  activeTask?: Task;
  onFocusComplete: (s: FocusSession) => void;
  onMenuClick: () => void;
  focusSessions: FocusSession[];
  unlockedTrees?: string[];
  onUnlockTree?: (treeId: string) => void;
}

type Tab = 'timer' | 'stats' | 'trees';
type AmbientSound = 'none' | 'rain' | 'waves' | 'wind' | 'forest' | 'birds';

interface TimerSettings {
  pomoDuration: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
  autoStartBreaks: boolean;
  autoStartPomos: boolean;
  tickSound: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  '🧠': <Brain size={18} />, '💻': <Code size={18} />, '📖': <BookOpen size={18} />,
  '✏️': <Pencil size={18} />, '🏋️': <Dumbbell size={18} />, '☕': <Coffee size={18} />,
  '🎯': <Target size={18} />, '⚡': <Zap size={18} />,
};

const AMBIENT_SOUNDS: { id: AmbientSound; label: string; icon: React.ReactNode }[] = [
  { id: 'none',   label: 'None',    icon: <VolumeX size={16} /> },
  { id: 'rain',   label: 'Rain',    icon: <CloudRain size={16} /> },
  { id: 'waves',  label: 'Waves',   icon: <Waves size={16} /> },
  { id: 'wind',   label: 'Wind',    icon: <Wind size={16} /> },
  { id: 'forest', label: 'Forest',  icon: <Leaf size={16} /> },
  { id: 'birds',  label: 'Birds',   icon: <Bird size={16} /> },
];

const TREE_TYPES = [
  { id: 'oak',     name: 'Oak',     cost: 0,    emoji: '🌳', desc: 'Classic oak tree' },
  { id: 'pine',    name: 'Pine',    cost: 50,   emoji: '🌲', desc: 'Evergreen pine' },
  { id: 'cherry',  name: 'Cherry',  cost: 100,  emoji: '🌸', desc: 'Blooming cherry' },
  { id: 'palm',    name: 'Palm',    cost: 150,  emoji: '🌴', desc: 'Tropical palm' },
  { id: 'cactus',  name: 'Cactus',  cost: 200,  emoji: '🌵', desc: 'Desert cactus' },
  { id: 'bamboo',  name: 'Bamboo',  cost: 250,  emoji: '🎋', desc: 'Lucky bamboo' },
  { id: 'maple',   name: 'Maple',   cost: 300,  emoji: '🍁', desc: 'Autumn maple' },
  { id: 'bonsai',  name: 'Bonsai',  cost: 500,  emoji: '🪴', desc: 'Ancient bonsai' },
];

const DEFAULT_SETTINGS: TimerSettings = {
  pomoDuration: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomos: false,
  tickSound: false,
};

const ICON_OPTIONS = ['🧠', '💻', '📖', '✏️', '🏋️', '☕', '🎯', '⚡', '🎵', '🎨', '🔬', '🌱'];
const COLOR_OPTIONS = [
  '#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444',
  '#06b6d4','#f97316','#6366f1','#84cc16',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

const totalFocusMinutes = (sessions: FocusSession[]) =>
  sessions.filter(s => s.status === 'completed').reduce((a, s) => a + s.duration, 0);

const totalCoins = (sessions: FocusSession[]) =>
  sessions.filter(s => s.status === 'completed').reduce((a, s) => a + (s.coinsEarned ?? 0), 0);

const todayKey = () => new Date().toISOString().slice(0, 10);

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string }> =
  ({ label, value, icon, color }) => (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + '22' }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{value}</p>
      </div>
    </div>
  );

// ─── Main Component ───────────────────────────────────────────────────────────

const FocusView: React.FC<FocusViewProps> = ({
  categories,
  onAddCategory,
  activeTask,
  onFocusComplete,
  onMenuClick,
  focusSessions,
  unlockedTrees = [],
  onUnlockTree,
}) => {

  // ── Tabs / UI state ──────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('timer');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);

  // ── Timer state ──────────────────────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    categories[0]?.id ?? null
  );
  const [timerSettings, setTimerSettings] = useState<TimerSettings>(DEFAULT_SETTINGS);
  const [isRunning, setIsRunning] = useState(false);
  const [timerPhase, setTimerPhase] = useState<'focus' | 'short-break' | 'long-break'>('focus');
  const [seconds, setSeconds] = useState(timerSettings.pomoDuration * 60);
  const [pomoCount, setPomoCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // ── Ambient sound ────────────────────────────────────────────────────────
  const [ambientSound, setAmbientSound] = useState<AmbientSound>('none');

  // ── Stopwatch ────────────────────────────────────────────────────────────
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [lapTimes, setLapTimes] = useState<number[]>([]);

  // ── Category form ────────────────────────────────────────────────────────
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🧠');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [newCatMode, setNewCatMode] = useState<TimerMode>('pomo');
  const [newCatDuration, setNewCatDuration] = useState(25);

  // ── Selected tree ────────────────────────────────────────────────────────
  const [selectedTreeId, setSelectedTreeId] = useState<string>(unlockedTrees[0] ?? 'oak');

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const swIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  const currentMode: TimerMode = selectedCategory?.mode ?? 'pomo';

  // ── Timer phase duration ─────────────────────────────────────────────────
  const phaseDuration = useCallback((phase: typeof timerPhase): number => {
    if (phase === 'focus') return (selectedCategory?.defaultDuration ?? timerSettings.pomoDuration) * 60;
    if (phase === 'short-break') return timerSettings.shortBreak * 60;
    return timerSettings.longBreak * 60;
  }, [selectedCategory, timerSettings]);

  // Reset timer on category/phase change
  useEffect(() => {
    if (!isRunning) setSeconds(phaseDuration(timerPhase));
  }, [selectedCategoryId, timerPhase, timerSettings, phaseDuration, isRunning]);

  // ── Pomodoro tick ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRunning && currentMode === 'pomo') {
      intervalRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            handlePomoEnd();
            return 0;
          }
          setElapsed(e => e + 1);
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, currentMode]);

  // ── Stopwatch tick ───────────────────────────────────────────────────────
  useEffect(() => {
    if (stopwatchRunning) {
      swIntervalRef.current = setInterval(() => setStopwatchSeconds(s => s + 1), 1000);
    }
    return () => { if (swIntervalRef.current) clearInterval(swIntervalRef.current); };
  }, [stopwatchRunning]);

  const handlePomoEnd = () => {
    const isFocus = timerPhase === 'focus';
    if (isFocus) {
      const coins = Math.floor((selectedCategory?.defaultDuration ?? timerSettings.pomoDuration) / 5);
      const session: FocusSession = {
        id: Date.now().toString(),
        duration: selectedCategory?.defaultDuration ?? timerSettings.pomoDuration,
        timestamp: new Date(),
        taskId: activeTask?.id,
        taskTitle: activeTask?.title,
        categoryId: selectedCategoryId ?? undefined,
        status: 'completed',
        treeId: selectedTreeId,
        coinsEarned: coins,
      };
      onFocusComplete(session);
      const newPomo = pomoCount + 1;
      setPomoCount(newPomo);
      if (notificationsEnabled && 'Notification' in window) {
        new Notification('Focus Complete! 🎉', { body: `Great work! +${coins} coins earned.` });
      }
      // advance phase
      if (newPomo % timerSettings.longBreakInterval === 0) {
        setTimerPhase('long-break');
        setSeconds(timerSettings.longBreak * 60);
      } else {
        setTimerPhase('short-break');
        setSeconds(timerSettings.shortBreak * 60);
      }
      if (timerSettings.autoStartBreaks) setIsRunning(true); else setIsRunning(false);
    } else {
      setTimerPhase('focus');
      setSeconds(phaseDuration('focus'));
      if (timerSettings.autoStartPomos) setIsRunning(true); else setIsRunning(false);
    }
    setElapsed(0);
  };

  const handleStart = () => {
    if (currentMode === 'pomo') {
      startTimeRef.current = Date.now();
      setIsRunning(true);
    } else {
      setStopwatchRunning(true);
    }
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(p => setNotificationsEnabled(p === 'granted'));
    }
  };

  const handlePause = () => {
    if (currentMode === 'pomo') setIsRunning(false);
    else setStopwatchRunning(false);
  };

  const handleStop = () => {
    if (currentMode === 'pomo' && elapsed > 0) {
      const session: FocusSession = {
        id: Date.now().toString(),
        duration: Math.floor(elapsed / 60),
        timestamp: new Date(),
        taskId: activeTask?.id,
        taskTitle: activeTask?.title,
        categoryId: selectedCategoryId ?? undefined,
        status: 'interrupted',
        treeId: selectedTreeId,
        coinsEarned: 0,
      };
      onFocusComplete(session);
    }
    setIsRunning(false);
    setElapsed(0);
    setTimerPhase('focus');
    setSeconds(phaseDuration('focus'));
  };

  const handleStopwatchStop = () => {
    if (stopwatchSeconds > 60) {
      const session: FocusSession = {
        id: Date.now().toString(),
        duration: Math.floor(stopwatchSeconds / 60),
        timestamp: new Date(),
        taskId: activeTask?.id,
        taskTitle: activeTask?.title,
        categoryId: selectedCategoryId ?? undefined,
        status: 'completed',
        coinsEarned: Math.floor(stopwatchSeconds / 300),
      };
      onFocusComplete(session);
    }
    setStopwatchRunning(false);
    setStopwatchSeconds(0);
    setLapTimes([]);
  };

  const handleAddLap = () => setLapTimes(prev => [...prev, stopwatchSeconds]);

  // ── Progress for pomo ring ───────────────────────────────────────────────
  const totalDuration = phaseDuration(timerPhase);
  const progress = ((totalDuration - seconds) / totalDuration) * 100;
  const circumference = 2 * Math.PI * 110;
  const strokeDash = circumference - (progress / 100) * circumference;

  // ── Category form handlers ───────────────────────────────────────────────
  const resetCatForm = () => {
    setNewCatName(''); setNewCatIcon('🧠'); setNewCatColor('#3b82f6');
    setNewCatMode('pomo'); setNewCatDuration(25); setShowNewCategory(false); setEditCategoryId(null);
  };

  const handleSaveCategory = () => {
    if (!newCatName.trim()) return;
    const cat: FocusCategory = {
      id: editCategoryId ?? Date.now().toString(),
      name: newCatName.trim(),
      icon: newCatIcon,
      color: newCatColor,
      mode: newCatMode,
      defaultDuration: newCatDuration,
      updatedAt: new Date(),
    };
    onAddCategory(cat);
    resetCatForm();
  };

  const startEditCategory = (cat: FocusCategory) => {
    setNewCatName(cat.name); setNewCatIcon(cat.icon); setNewCatColor(cat.color);
    setNewCatMode(cat.mode); setNewCatDuration(cat.defaultDuration);
    setEditCategoryId(cat.id); setShowNewCategory(true);
  };

  // ── Stats helpers ────────────────────────────────────────────────────────
  const totalMins = totalFocusMinutes(focusSessions);
  const coins = totalCoins(focusSessions);
  const todaySessions = focusSessions.filter(s =>
    new Date(s.timestamp).toISOString().slice(0,10) === todayKey()
  );
  const todayMins = todaySessions.filter(s => s.status === 'completed')
    .reduce((a, s) => a + s.duration, 0);
  const streakDays = (() => {
    const days = new Set(focusSessions.filter(s => s.status === 'completed')
      .map(s => new Date(s.timestamp).toISOString().slice(0,10)));
    let streak = 0, d = new Date();
    while (days.has(d.toISOString().slice(0,10))) {
      streak++; d.setDate(d.getDate() - 1);
    }
    return streak;
  })();

  // ── Pomo phase colors ────────────────────────────────────────────────────
  const phaseColor = timerPhase === 'focus'
    ? (selectedCategory?.color ?? '#3b82f6')
    : timerPhase === 'short-break' ? '#10b981' : '#8b5cf6';

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`flex flex-col h-full bg-white dark:bg-slate-950 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onMenuClick} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Focus</h1>
            {activeTask && (
              <p className="text-xs text-orange-500 truncate max-w-[200px]">📌 {activeTask.title}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full">
            <Coins size={14} className="text-amber-500" />
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">{coins}</span>
          </div>
          <button onClick={() => setIsFullscreen(f => !f)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button onClick={() => setShowSettings(s => !s)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────── */}
      <div className="flex gap-1 mx-4 mb-3 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl shrink-0">
        {(['timer', 'stats', 'trees'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-xl transition-all capitalize ${
              tab === t
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}>
            {t === 'timer' ? '⏱ Timer' : t === 'stats' ? '📊 Stats' : '🌳 Trees'}
          </button>
        ))}
      </div>

      {/* ── Settings panel ────────────────────────────────────────────── */}
      {showSettings && (
        <div className="mx-4 mb-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shrink-0 text-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Timer Settings</span>
            <button onClick={() => setShowSettings(false)}><X size={16} className="text-slate-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'pomoDuration', label: 'Focus (min)' },
              { key: 'shortBreak',   label: 'Short Break' },
              { key: 'longBreak',    label: 'Long Break'  },
              { key: 'longBreakInterval', label: 'Pomos before long' },
            ].map(({ key, label }) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                <input type="number" min={1} max={120}
                  value={(timerSettings as any)[key]}
                  onChange={e => setTimerSettings(s => ({ ...s, [key]: +e.target.value }))}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-1.5
                    bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'autoStartBreaks', label: 'Auto-start breaks' },
              { key: 'autoStartPomos',  label: 'Auto-start focus'  },
              { key: 'tickSound',       label: 'Tick sound'        },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(timerSettings as any)[key]}
                  onChange={e => setTimerSettings(s => ({ ...s, [key]: e.target.checked }))}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300">{label}</span>
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={notificationsEnabled}
              onChange={e => {
                if (e.target.checked && 'Notification' in window) {
                  Notification.requestPermission().then(p => setNotificationsEnabled(p === 'granted'));
                } else setNotificationsEnabled(false);
              }}
              className="w-4 h-4 accent-blue-500"
            />
            <span className="text-xs text-slate-600 dark:text-slate-300">Desktop notifications</span>
            {notificationsEnabled ? <Bell size={13} className="text-orange-500" /> : <BellOff size={13} className="text-slate-400" />}
          </label>
        </div>
      )}

      {/* ── Scrollable body ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-4">

        {/* ══════════ TIMER TAB ══════════ */}
        {tab === 'timer' && (
          <>
            {/* Category selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Category</span>
                <button onClick={() => { resetCatForm(); setShowNewCategory(true); }}
                  className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-500 font-medium">
                  <Plus size={13} /> New
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {categories.map(cat => (
                  <button key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    onDoubleClick={() => startEditCategory(cat)}
                    className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all text-sm font-medium ${
                      selectedCategoryId === cat.id
                        ? 'text-white shadow-md scale-105'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                    }`}
                    style={selectedCategoryId === cat.id ? { background: cat.color, borderColor: cat.color } : {}}
                    title="Double-click to edit"
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                    {cat.mode === 'stopwatch' && <Clock size={11} className="opacity-70" />}
                  </button>
                ))}
              </div>
            </div>

            {/* New / Edit category form */}
            {showNewCategory && (
              <div className="bg-slate-50 dark:bg-slate-800/70 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {editCategoryId ? 'Edit Category' : 'New Category'}
                </p>
                <input placeholder="Category name" value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2
                    bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div>
                  <p className="text-xs text-slate-400 mb-1">Icon</p>
                  <div className="flex gap-2 flex-wrap">
                    {ICON_OPTIONS.map(ic => (
                      <button key={ic} onClick={() => setNewCatIcon(ic)}
                        className={`text-xl p-1.5 rounded-lg transition-all ${
                          newCatIcon === ic ? 'bg-orange-100 dark:bg-orange-900/40 ring-2 ring-blue-400 scale-110' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}>{ic}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Color</p>
                  <div className="flex gap-2 flex-wrap">
                    {COLOR_OPTIONS.map(c => (
                      <button key={c} onClick={() => setNewCatColor(c)}
                        className={`w-7 h-7 rounded-full transition-all ${newCatColor === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 mb-1">Mode</p>
                    <div className="flex gap-2">
                      {(['pomo', 'stopwatch'] as TimerMode[]).map(m => (
                        <button key={m} onClick={() => setNewCatMode(m)}
                          className={`flex-1 py-1.5 text-xs rounded-xl font-medium transition-all ${
                            newCatMode === m
                              ? 'bg-orange-500 text-white'
                              : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                          }`}>
                          {m === 'pomo' ? '🍅 Pomodoro' : '⏱ Stopwatch'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {newCatMode === 'pomo' && (
                    <div>
                      <p className="text-xs text-slate-400 mb-1">Duration (min)</p>
                      <input type="number" min={1} max={120} value={newCatDuration}
                        onChange={e => setNewCatDuration(+e.target.value)}
                        className="w-20 border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-1.5
                          bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSaveCategory}
                    className="flex-1 bg-orange-500 hover:bg-gradient-to-br from-orange-500 to-amber-400 text-white py-2 rounded-xl text-sm font-semibold transition-all">
                    {editCategoryId ? 'Save Changes' : 'Add Category'}
                  </button>
                  <button onClick={resetCatForm}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* ── Pomodoro Timer ──────────────────────────────────────── */}
            {currentMode === 'pomo' && (
              <div className="flex flex-col items-center">
                {/* Phase switcher */}
                <div className="flex gap-2 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                  {([
                    { id: 'focus', label: 'Focus' },
                    { id: 'short-break', label: 'Short Break' },
                    { id: 'long-break', label: 'Long Break' },
                  ] as { id: typeof timerPhase; label: string }[]).map(p => (
                    <button key={p.id} onClick={() => { if (!isRunning) { setTimerPhase(p.id); setSeconds(phaseDuration(p.id)); setElapsed(0); } }}
                      disabled={isRunning}
                      className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all disabled:opacity-50 ${
                        timerPhase === p.id
                          ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Circular progress ring */}
                <div className="relative w-64 h-64 mb-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 240 240">
                    <circle cx="120" cy="120" r="110" fill="none"
                      stroke="currentColor" strokeWidth="8"
                      className="text-slate-100 dark:text-slate-800" />
                    <circle cx="120" cy="120" r="110" fill="none"
                      stroke={phaseColor} strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDash}
                      style={{ transition: 'stroke-dashoffset 1s linear' }}
                    />
                  </svg>
                  {/* Inner content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                    <span className="text-5xl font-bold tabular-nums text-slate-800 dark:text-white tracking-tight">
                      {fmt(seconds)}
                    </span>
                    <span className="text-xs font-medium capitalize px-3 py-1 rounded-full"
                      style={{ background: phaseColor + '22', color: phaseColor }}>
                      {timerPhase.replace('-', ' ')}
                    </span>
                    {isRunning && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                        {Math.floor(elapsed / 60)}m {elapsed % 60}s elapsed
                      </span>
                    )}
                  </div>
                </div>

                {/* Pomo dots */}
                <div className="flex gap-2 mb-4">
                  {Array.from({ length: timerSettings.longBreakInterval }).map((_, i) => (
                    <div key={i} className={`w-3 h-3 rounded-full transition-all ${
                      i < (pomoCount % timerSettings.longBreakInterval)
                        ? 'scale-110'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }`} style={i < (pomoCount % timerSettings.longBreakInterval) ? { background: phaseColor } : {}} />
                  ))}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                  <button onClick={() => { setSeconds(phaseDuration(timerPhase)); setIsRunning(false); setElapsed(0); }}
                    className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                    <RefreshCw size={18} />
                  </button>
                  {!isRunning ? (
                    <button onClick={handleStart}
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                      style={{ background: phaseColor }}>
                      <Play size={24} fill="white" />
                    </button>
                  ) : (
                    <button onClick={handlePause}
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-105 active:scale-95"
                      style={{ background: phaseColor }}>
                      <Pause size={24} fill="white" />
                    </button>
                  )}
                  <button onClick={handleStop}
                    className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-300 hover:text-red-500">
                    <Square size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Stopwatch ───────────────────────────────────────────── */}
            {currentMode === 'stopwatch' && (
              <div className="flex flex-col items-center">
                <div className="relative w-64 h-64 mb-4 flex items-center justify-center">
                  <div className="w-56 h-56 rounded-full border-8 border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-1"
                    style={{ borderColor: stopwatchRunning ? (selectedCategory?.color ?? '#3b82f6') + '44' : undefined }}>
                    <span className="text-5xl font-bold tabular-nums text-slate-800 dark:text-white">
                      {fmt(stopwatchSeconds)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {lapTimes.length > 0 && `Lap ${lapTimes.length + 1}`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <button onClick={handleAddLap} disabled={!stopwatchRunning}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700">
                    Lap
                  </button>
                  {!stopwatchRunning ? (
                    <button onClick={handleStart}
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-105"
                      style={{ background: selectedCategory?.color ?? '#3b82f6' }}>
                      <Play size={24} fill="white" />
                    </button>
                  ) : (
                    <button onClick={handlePause}
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all hover:scale-105"
                      style={{ background: selectedCategory?.color ?? '#3b82f6' }}>
                      <Pause size={24} fill="white" />
                    </button>
                  )}
                  <button onClick={handleStopwatchStop}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40">
                    Stop
                  </button>
                </div>
                {lapTimes.length > 0 && (
                  <div className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 space-y-1 max-h-40 overflow-y-auto">
                    {lapTimes.map((t, i) => {
                      const lapTime = i === 0 ? t : t - lapTimes[i - 1];
                      return (
                        <div key={i} className="flex justify-between text-sm px-2">
                          <span className="text-slate-500 dark:text-slate-400">Lap {i + 1}</span>
                          <span className="font-mono text-slate-700 dark:text-slate-200">{fmt(lapTime)}</span>
                          <span className="font-mono text-slate-400">{fmt(t)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Ambient Sound ───────────────────────────────────────── */}
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Ambient Sound
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {AMBIENT_SOUNDS.map(s => (
                  <button key={s.id} onClick={() => setAmbientSound(s.id)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-medium transition-all ${
                      ambientSound === s.id
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-300'
                    }`}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
              {ambientSound !== 'none' && (
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                  <Volume2 size={11} /> Playing: {ambientSound} (connect audio source)
                </p>
              )}
            </div>

            {/* ── Today's sessions preview ────────────────────────────── */}
            {todaySessions.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                  Today's Sessions
                </p>
                <div className="space-y-1.5">
                  {todaySessions.slice(-5).reverse().map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        {s.status === 'completed'
                          ? <CheckCircle2 size={14} className="text-green-500" />
                          : <AlertCircle size={14} className="text-amber-500" />}
                        <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
                          {s.taskTitle ?? categories.find(c => c.id === s.categoryId)?.name ?? 'Focus'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{s.duration}m</span>
                        {s.coinsEarned! > 0 && (
                          <span className="text-xs text-amber-500">+{s.coinsEarned}🪙</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════ STATS TAB ══════════ */}
        {tab === 'stats' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Today" value={`${todayMins}m`} icon={<Sun size={16} />} color="#f59e0b" />
              <StatCard label="Total Hours" value={`${Math.floor(totalMins / 60)}h ${totalMins % 60}m`} icon={<Clock size={16} />} color="#3b82f6" />
              <StatCard label="Streak" value={`${streakDays} days`} icon={<Flame size={16} />} color="#ef4444" />
              <StatCard label="Coins" value={coins} icon={<Coins size={16} />} color="#f59e0b" />
              <StatCard label="Sessions" value={focusSessions.filter(s => s.status === 'completed').length} icon={<CheckCircle2 size={16} />} color="#10b981" />
              <StatCard label="Pomodoros" value={pomoCount} icon={<Target size={16} />} color="#8b5cf6" />
            </div>

            {/* Weekly bar chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Last 7 Days</p>
              <div className="flex items-end gap-2 h-24">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date(); d.setDate(d.getDate() - (6 - i));
                  const key = d.toISOString().slice(0, 10);
                  const mins = focusSessions
                    .filter(s => s.status === 'completed' && new Date(s.timestamp).toISOString().slice(0, 10) === key)
                    .reduce((a, s) => a + s.duration, 0);
                  const maxMins = 120;
                  const h = Math.max(4, Math.min(96, (mins / maxMins) * 96));
                  const isToday = key === todayKey();
                  return (
                    <div key={key} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-slate-400">{mins > 0 ? `${mins}m` : ''}</span>
                      <div className="w-full rounded-t-lg transition-all"
                        style={{ height: h, background: isToday ? '#3b82f6' : '#93c5fd', opacity: isToday ? 1 : 0.7 }} />
                      <span className={`text-xs font-medium ${isToday ? 'text-orange-500' : 'text-slate-400'}`}>
                        {['S','M','T','W','T','F','S'][d.getDay()]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category breakdown */}
            {categories.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">By Category</p>
                <div className="space-y-2">
                  {categories.map(cat => {
                    const mins = focusSessions
                      .filter(s => s.status === 'completed' && s.categoryId === cat.id)
                      .reduce((a, s) => a + s.duration, 0);
                    if (mins === 0) return null;
                    const pct = totalMins > 0 ? Math.round((mins / totalMins) * 100) : 0;
                    return (
                      <div key={cat.id}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-600 dark:text-slate-300 font-medium">{cat.icon} {cat.name}</span>
                          <span className="text-slate-400">{mins}m · {pct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cat.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent sessions */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Recent Sessions</p>
              {focusSessions.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No sessions yet. Start focusing!</p>
              ) : (
                <div className="space-y-2">
                  {[...focusSessions].reverse().slice(0, 10).map(s => (
                    <div key={s.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                      <div className="flex items-center gap-2">
                        {s.status === 'completed'
                          ? <CheckCircle2 size={14} className="text-green-500" />
                          : s.status === 'interrupted'
                          ? <AlertCircle size={14} className="text-amber-500" />
                          : <X size={14} className="text-red-400" />}
                        <div>
                          <p className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[160px]">
                            {s.taskTitle ?? categories.find(c => c.id === s.categoryId)?.name ?? 'Focus Session'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(s.timestamp).toLocaleDateString()} · {new Date(s.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.duration}m</p>
                        {s.coinsEarned! > 0 && <p className="text-xs text-amber-500">+{s.coinsEarned}🪙</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════ TREES TAB ══════════ */}
        {tab === 'trees' && (
          <>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-800/40 flex items-center justify-center text-2xl">
                {TREE_TYPES.find(t => t.id === selectedTreeId)?.emoji ?? '🌳'}
              </div>
              <div>
                <p className="font-semibold text-green-800 dark:text-green-200">
                  {TREE_TYPES.find(t => t.id === selectedTreeId)?.name ?? 'Oak'} Forest
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {unlockedTrees.length} / {TREE_TYPES.length} trees unlocked · {coins}🪙 available
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {TREE_TYPES.map(tree => {
                const isUnlocked = tree.cost === 0 || unlockedTrees.includes(tree.id);
                const isSelected = selectedTreeId === tree.id;
                const canAfford = coins >= tree.cost;
                return (
                  <div key={tree.id}
                    onClick={() => isUnlocked && setSelectedTreeId(tree.id)}
                    className={`relative rounded-2xl p-4 border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                        : isUnlocked
                        ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-green-300'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 opacity-70'
                    }`}>
                    <div className="text-4xl text-center mb-2 filter" style={!isUnlocked ? { filter: 'grayscale(100%)' } : {}}>
                      {tree.emoji}
                    </div>
                    <p className={`text-sm font-semibold text-center ${isSelected ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-200'}`}>
                      {tree.name}
                    </p>
                    <p className="text-xs text-slate-400 text-center mb-2">{tree.desc}</p>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-400 flex items-center justify-center">
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                    {!isUnlocked && (
                      <button
                        onClick={e => { e.stopPropagation(); if (canAfford && onUnlockTree) onUnlockTree(tree.id); }}
                        disabled={!canAfford}
                        className={`w-full py-1.5 rounded-xl text-xs font-semibold transition-all ${
                          canAfford
                            ? 'bg-amber-400 hover:bg-amber-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}>
                        🪙 {tree.cost} {canAfford ? 'Unlock' : 'Need more'}
                      </button>
                    )}
                    {isUnlocked && !isSelected && (
                      <div className="text-center text-xs text-green-600 dark:text-green-400 font-medium">Tap to use</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Info size={13} />
                Complete focus sessions to earn coins. Each 5 minutes of focused work earns 1 coin. Use coins to unlock new tree types for your forest.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FocusView;
