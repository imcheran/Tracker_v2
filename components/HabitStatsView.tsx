import React, { useState, useMemo } from 'react';
import { ArrowLeft, Flame, CheckCircle2, TrendingUp, Calendar, Share2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, Cell, PieChart, Pie, Legend
} from 'recharts';
import { Habit } from '../types';
import { format, subDays, eachDayOfInterval } from 'date-fns';

interface HabitStatsViewProps {
  habits: Habit[];
  onClose: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const HabitStatsView: React.FC<HabitStatsViewProps> = ({ habits, onClose }) => {
  const [selectedHabit, setSelectedHabit] = useState<string | 'all'>('all');
  const [range, setRange] = useState<7 | 30 | 90>(30);

  const activeHabits = habits.filter(h => !h.isArchived);

  const days = useMemo(() => {
    const end = new Date();
    const start = subDays(end, range - 1);
    return eachDayOfInterval({ start, end });
  }, [range]);

  // Daily completion data for bar chart
  const dailyData = useMemo(() => {
    return days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const habitsToCheck = selectedHabit === 'all' ? activeHabits : activeHabits.filter(h => h.id === selectedHabit);
      const completed = habitsToCheck.filter(h => h.history?.[dateKey]?.completed).length;
      return {
        date: format(day, range === 7 ? 'EEE' : 'MMM d'),
        completed,
        total: habitsToCheck.length,
        rate: habitsToCheck.length > 0 ? Math.round((completed / habitsToCheck.length) * 100) : 0,
      };
    });
  }, [days, selectedHabit, activeHabits, range]);

  // Per-habit completion rates for radar/pie
  const habitRates = useMemo(() => {
    return activeHabits.map(habit => {
      const completed = days.filter(day => {
        const key = format(day, 'yyyy-MM-dd');
        return habit.history?.[key]?.completed;
      }).length;
      return {
        name: habit.name.length > 12 ? habit.name.slice(0, 12) + '…' : habit.name,
        fullName: habit.name,
        rate: days.length > 0 ? Math.round((completed / days.length) * 100) : 0,
        completed,
        icon: habit.icon,
        color: habit.color,
        streak: calculateStreak(habit),
      };
    }).sort((a, b) => b.rate - a.rate);
  }, [activeHabits, days]);

  // Section breakdown pie
  const sectionData = useMemo(() => {
    const map: Record<string, number> = {};
    activeHabits.forEach(h => {
      const s = h.section || 'Others';
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [activeHabits]);

  function calculateStreak(habit: Habit): number {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const key = format(subDays(today, i), 'yyyy-MM-dd');
      if (habit.history?.[key]?.completed) streak++;
      else break;
    }
    return streak;
  }

  const overallRate = useMemo(() => {
    const total = dailyData.reduce((s, d) => s + d.total, 0);
    const completed = dailyData.reduce((s, d) => s + d.completed, 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [dailyData]);

  const topStreak = useMemo(() => Math.max(0, ...habitRates.map(h => h.streak)), [habitRates]);

  const handleShare = async () => {
    const text = `My habit stats — ${activeHabits.length} active habits tracked! Check them out.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Habit Stats', text });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      await navigator.clipboard.writeText(text);
      alert('Stats copied to clipboard!');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Habit Analytics</h1>
        </div>
        <button onClick={handleShare} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors">
          <Share2 size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Range selector */}
        <div className="flex gap-2">
          {([7, 30, 90] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                range === r
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {r}d
            </button>
          ))}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-indigo-50 dark:bg-blue-950/30 rounded-2xl p-3 text-center">
            <CheckCircle2 size={20} className="text-indigo-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-indigo-500">{overallRate}%</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Overall Rate</div>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl p-3 text-center">
            <Flame size={20} className="text-indigo-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-indigo-500">{topStreak}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Top Streak</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950/30 rounded-2xl p-3 text-center">
            <TrendingUp size={20} className="text-green-500 mx-auto mb-1" />
            <div className="text-2xl font-bold text-green-600">{activeHabits.length}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Active Habits</div>
          </div>
        </div>

        {/* Habit filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          <button
            onClick={() => setSelectedHabit('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedHabit === 'all'
                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            All Habits
          </button>
          {activeHabits.map(h => (
            <button
              key={h.id}
              onClick={() => setSelectedHabit(h.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedHabit === h.id
                  ? 'text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
              style={selectedHabit === h.id ? { backgroundColor: h.color } : {}}
            >
              {h.icon} {h.name}
            </button>
          ))}
        </div>

        {/* Daily Completion Bar Chart */}
        <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
            Daily Completion Rate
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData} barSize={range === 7 ? 24 : range === 30 ? 10 : 5}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                interval={range === 90 ? 6 : range === 30 ? 4 : 0}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                formatter={(val: number) => [`${val}%`, 'Rate']}
                contentStyle={{
                  background: 'var(--tw-bg-opacity, #1e293b)',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="rate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Per-Habit Rates */}
        {habitRates.length > 0 && (
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Habit Completion Rates
            </h2>
            <div className="space-y-3">
              {habitRates.map((h, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <span>{h.icon}</span> {h.fullName}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-indigo-500 flex items-center gap-0.5">
                        <Flame size={10} /> {h.streak}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{h.rate}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${h.rate}%`, backgroundColor: h.color || '#3b82f6' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section Breakdown Pie */}
        {sectionData.length > 1 && (
          <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              <Calendar size={14} className="inline mr-1" />
              Habits by Routine
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={sectionData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={false} fontSize={11}>
                  {sectionData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default HabitStatsView;
