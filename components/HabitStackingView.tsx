import React, { useState } from 'react';
import { Play, Plus, ChevronLeft, CheckCircle2, Circle, Zap } from 'lucide-react';
import { Habit, HabitRoutine } from '../types';
import { format } from 'date-fns';

interface HabitStackingViewProps {
  habits: Habit[];
  routines: HabitRoutine[];
  onAddRoutine: (r: HabitRoutine) => void;
  onDeleteRoutine: (id: string) => void;
  onToggleHabit: (id: string, date: string) => void;
  onClose: () => void;
}

export const HabitStackingView: React.FC<HabitStackingViewProps> = ({
  habits, routines, onAddRoutine, onDeleteRoutine, onToggleHabit, onClose,
}) => {
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [section, setSection] = useState<'Morning' | 'Evening' | 'Custom'>('Morning');
  const today = format(new Date(), 'yyyy-MM-dd');

  const activeRoutine = routines.find(r => r.id === activeRoutineId);
  const currentHabit = activeRoutine
    ? habits.find(h => h.id === activeRoutine.habitIds[currentIdx])
    : null;

  const handleNext = () => {
    if (!activeRoutine || !currentHabit) return;
    onToggleHabit(currentHabit.id, today);
    if (currentIdx < activeRoutine.habitIds.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setActiveRoutineId(null);
      setCurrentIdx(0);
    }
  };

  const handleStart = (r: HabitRoutine) => {
    setActiveRoutineId(r.id);
    setCurrentIdx(0);
  };

  const handleSave = () => {
    if (!name || selected.length === 0) return;
    onAddRoutine({
      id: Date.now().toString(),
      name, section, habitIds: selected,
      color: '#f97316', icon: '⚡',
      createdAt: new Date(), updatedAt: new Date(),
    });
    setShowForm(false); setName(''); setSelected([]);
  };

  // Active routine runner
  if (activeRoutine && currentHabit) {
    const progress = ((currentIdx) / activeRoutine.habitIds.length) * 100;
    return (
      <div className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-gradient-to-br from-orange-500 to-amber-400 p-6">
        <div className="w-full max-w-sm text-center text-white space-y-6">
          <p className="text-sm font-bold opacity-80">{activeRoutine.name}</p>
          <div className="w-full h-2 bg-white/30 rounded-full">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm opacity-70">{currentIdx + 1} / {activeRoutine.habitIds.length}</p>
          <div className="bg-white/20 rounded-3xl p-8 backdrop-blur">
            <p className="text-5xl mb-4">{currentHabit.icon}</p>
            <p className="text-2xl font-black">{currentHabit.name}</p>
            {currentHabit.description && <p className="text-sm opacity-80 mt-2">{currentHabit.description}</p>}
          </div>
          <button onClick={handleNext}
            className="w-full py-4 bg-white text-orange-500 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-transform">
            {currentIdx < activeRoutine.habitIds.length - 1 ? '✓ Done, Next →' : '🎉 Complete!'}
          </button>
          <button onClick={() => setActiveRoutineId(null)} className="text-white/60 text-sm underline">Exit routine</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900 animate-slide-up">
      <div className="pt-safe shrink-0 border-b border-slate-100 dark:border-slate-800">
        <div className="h-14 flex items-center px-4 gap-3">
          <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white flex-1">Habit Routines</h1>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1 bg-gradient-to-br from-orange-500 to-amber-400 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow">
            <Plus size={14} /> New
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-safe">
        {routines.map(r => {
          const routineHabits = r.habitIds.map(id => habits.find(h => h.id === id)).filter(Boolean) as Habit[];
          const doneCount = routineHabits.filter(h => h.history[today]?.completed).length;
          return (
            <div key={r.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">{r.name}</p>
                  <p className="text-xs text-slate-400">{r.section} · {routineHabits.length} habits · {doneCount}/{routineHabits.length} done</p>
                </div>
                <button onClick={() => handleStart(r)}
                  className="flex items-center gap-1.5 bg-gradient-to-br from-orange-500 to-amber-400 text-white text-xs font-bold px-3 py-2 rounded-xl shadow">
                  <Play size={13} /> Start
                </button>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {routineHabits.map(h => (
                  <span key={h.id} className={`text-xs px-2 py-1 rounded-lg font-medium ${h.history[today]?.completed ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                    {h.icon} {h.name}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        {showForm && (
          <div className="bg-orange-50 dark:bg-slate-800 rounded-2xl p-4 border border-orange-200 dark:border-orange-900/40 space-y-3 animate-scale-in">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Routine name"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none" />
            <select value={section} onChange={e => setSection(e.target.value as any)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none">
              {['Morning','Evening','Custom'].map(s => <option key={s}>{s}</option>)}
            </select>
            <p className="text-xs font-bold text-slate-500">Select habits (in order):</p>
            {habits.filter(h => !h.isArchived).map(h => (
              <label key={h.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={selected.includes(h.id)} onChange={e => setSelected(e.target.checked ? [...selected, h.id] : selected.filter(id => id !== h.id))} />
                <span className="text-sm text-slate-700 dark:text-slate-200">{h.icon} {h.name}</span>
              </label>
            ))}
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 text-sm font-bold text-slate-500 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-2 text-sm font-bold text-white bg-gradient-to-br from-orange-500 to-amber-400 rounded-xl">Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
