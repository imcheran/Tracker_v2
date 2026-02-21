
import React, { useState, useMemo, useEffect } from 'react';
import { Habit, HabitLog } from '../types';
import { 
  Plus, ChevronRight, Check, Bell, Clock, User, Star, CloudSun, Menu, Zap, Calendar, ArrowRight
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay, isToday, isBefore, isAfter, startOfDay } from 'date-fns';
import HabitFormSheet from './HabitFormSheet';
import HabitDetailView from './HabitDetailView';

interface HabitViewProps {
  habits: Habit[];
  onToggleHabit: (id: string, date: string) => void;
  onUpdateHabit: (habit: Habit) => void;
  onAddHabit: (habit: Habit) => void;
  onDeleteHabit: (id: string) => void;
  onMenuClick?: () => void;
  onOpenStats: () => void;
  onStartFocus?: (habitId: string) => void;
  user?: any;
}

const HabitCard: React.FC<{
    habit: Habit;
    dateStr: string;
    onToggle: () => void;
    onClick: () => void;
}> = ({ habit, dateStr, onToggle, onClick }) => {
    const isCompleted = (habit.history?.[dateStr] as HabitLog | undefined)?.completed;
    const isFrozen = habit.freezeDates?.includes(dateStr);
    
    // Calculate streak
    let streak = 0;
    const today = new Date();
    let d = new Date();
    while (true) {
        const dStr = format(d, 'yyyy-MM-dd');
        if (habit.history[dStr]?.completed) {
            streak++;
            d.setDate(d.getDate() - 1);
        } else if (habit.freezeDates?.includes(dStr)) {
            d.setDate(d.getDate() - 1);
        } else if (isSameDay(d, today) && !habit.history[dStr]?.completed) {
            d.setDate(d.getDate() - 1);
        } else {
            break;
        }
    }

    return (
        <div 
            onClick={onClick}
            className={`
                relative aspect-square p-4 rounded-[28px] border transition-all duration-500 cursor-pointer flex flex-col justify-between group bento-card overflow-hidden
                ${isCompleted 
                    ? 'border-transparent text-white shadow-xl scale-[1.02]' 
                    : isFrozen
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-emerald-200'
                }
            `}
            style={{ 
                backgroundColor: isCompleted ? habit.color : undefined,
                boxShadow: isCompleted ? `0 10px 40px -10px ${habit.color}80` : undefined
            }}
        >
            {/* Background Icon (Decorative) */}
            <div className={`absolute -right-2 -bottom-2 text-8xl opacity-10 pointer-events-none transition-transform duration-500 group-hover:scale-110 ${isCompleted ? 'text-white' : 'grayscale'}`}>
                {habit.icon}
            </div>

            {/* Glowing Effect for Completed */}
            {isCompleted && <div className="absolute inset-0 bg-white/20 blur-xl opacity-50 rounded-full" />}

            <div className="flex justify-between items-start z-10 relative">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-colors ${isCompleted ? 'bg-white/20 text-white backdrop-blur-sm shadow-inner' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {habit.icon}
                </div>
                {habit.isNegative && !isCompleted && (
                    <div className="absolute top-0 right-12 mr-2 bg-red-100 text-red-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                        Quit
                    </div>
                )}
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggle(); }}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 active:scale-90 
                        ${isCompleted 
                            ? 'bg-white text-current border-white shadow-lg' 
                            : isFrozen
                                ? 'bg-blue-100 text-blue-500 border-blue-200'
                                : 'border-slate-200 dark:border-slate-700 hover:border-emerald-400 bg-white dark:bg-slate-800'
                        }`}
                    style={{ color: isCompleted ? habit.color : undefined }}
                >
                    {isCompleted && <Check size={20} strokeWidth={4} />}
                    {isFrozen && !isCompleted && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                </button>
            </div>

            <div className="z-10 relative">
                <h3 className={`font-bold text-lg leading-tight mb-1 truncate ${isCompleted ? 'text-white drop-shadow-md' : 'text-slate-800 dark:text-slate-100'}`}>
                    {habit.name}
                </h3>
                <div className={`text-xs font-bold ${isCompleted ? 'text-white/90' : 'text-slate-400'}`}>
                    {streak} Day Streak {isFrozen && '(Frozen)'}
                </div>
            </div>
        </div>
    );
};

const HabitView: React.FC<HabitViewProps> = React.memo(({ 
    habits, onToggleHabit, onUpdateHabit, onAddHabit, onDeleteHabit, onMenuClick, onOpenStats, onStartFocus, user
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [greeting, setGreeting] = useState('');

  const selectedHabit = useMemo(() => 
    habits.find(h => h.id === selectedHabitId) || null
  , [habits, selectedHabitId]);

  useEffect(() => {
    const updateGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    };
    updateGreeting();
  }, []);

  const calendarDays = useMemo(() => {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');

  // Filter habits based on Start Date and End Date
  const filteredHabits = useMemo(() => {
      const selectedDayStart = startOfDay(selectedDate);
      return habits.filter(h => {
          if (h.isArchived) return false;
          if (h.startDate && isBefore(selectedDayStart, startOfDay(new Date(h.startDate)))) return false;
          if (h.endDate && isAfter(selectedDayStart, startOfDay(new Date(h.endDate)))) return false;
          return true;
      });
  }, [habits, selectedDate]);

  // Group habits by Routine
  const groupedHabits = useMemo(() => {
      const groups: Record<string, Habit[]> = {};
      const others: Habit[] = [];
      
      filteredHabits.forEach(h => {
          if (h.routine) {
              if (!groups[h.routine]) groups[h.routine] = [];
              groups[h.routine].push(h);
          } else {
              others.push(h);
          }
      });
      
      return { groups, others };
  }, [filteredHabits]);

  if (selectedHabit) {
      return (
          <HabitDetailView 
              habit={selectedHabit}
              onClose={() => setSelectedHabitId(null)}
              onToggleCheck={(date) => onToggleHabit(selectedHabit.id, date)}
              onEdit={onUpdateHabit}
              onDelete={onDeleteHabit}
              onStartFocus={() => onStartFocus && onStartFocus(selectedHabit.id)}
              onOpenStats={onOpenStats}
          />
      );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-950">
        
        {/* Header - Safe Area Wrapper */}
        <div className="pt-[calc(env(safe-area-inset-top)+1rem)] shrink-0 px-4 z-20">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-sm rounded-[32px] p-5 flex flex-col gap-5">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <button onClick={onMenuClick} className="md:hidden p-2 -ml-2 text-slate-500 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                                <Menu size={24}/>
                            </button>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{greeting}</h1>
                        </div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Keep up the momentum</p>
                    </div>
                    <button onClick={onOpenStats} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-600 dark:text-slate-300 hover:scale-105 transition-transform shadow-sm">
                        <ArrowRight size={20} />
                    </button>
                </div>

                {/* Calendar Strip */}
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl">
                    {calendarDays.map(day => {
                        const isSelected = isSameDay(day, selectedDate);
                        const isTodayDate = isToday(day);
                        return (
                            <button 
                                key={day.toString()}
                                onClick={() => setSelectedDate(day)}
                                className={`
                                    flex flex-col items-center justify-center flex-1 h-14 rounded-xl transition-all duration-300
                                    ${isSelected 
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105' 
                                        : 'text-slate-400 dark:text-slate-500 hover:bg-white dark:hover:bg-slate-800'
                                    }
                                `}
                            >
                                <span className={`text-[10px] font-bold mb-0.5 uppercase ${isSelected ? 'text-emerald-100' : ''}`}>{format(day, 'EEE')}</span>
                                <span className={`text-sm font-bold ${isTodayDate && !isSelected ? 'text-emerald-500' : ''}`}>{format(day, 'd')}</span>
                                {isTodayDate && !isSelected && <div className="w-1 h-1 bg-emerald-500 rounded-full mt-0.5"></div>}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Habit Grid Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pb-32 pt-6 z-10 relative space-y-8">
            
            {/* Render Groups */}
            {Object.entries(groupedHabits.groups).map(([routineName, groupHabits]) => (
                <div key={routineName} className="animate-slide-up">
                    <div className="flex items-center gap-2 mb-4 px-2">
                        <div className="w-1 h-4 bg-emerald-500 rounded-full"></div>
                        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">{routineName}</h2>
                        <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">{groupHabits.length}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {groupHabits.map(habit => (
                            <HabitCard 
                                key={habit.id}
                                habit={habit}
                                dateStr={selectedDateStr}
                                onToggle={() => onToggleHabit(habit.id, selectedDateStr)}
                                onClick={() => setSelectedHabitId(habit.id)}
                            />
                        ))}
                    </div>
                </div>
            ))}

            {/* Render Others */}
            {groupedHabits.others.length > 0 && (
                <div className="animate-slide-up">
                    {Object.keys(groupedHabits.groups).length > 0 && (
                         <div className="flex items-center gap-2 mb-4 px-2">
                            <div className="w-1 h-4 bg-slate-400 rounded-full"></div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">Habits</h2>
                        </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {groupedHabits.others.map(habit => (
                            <HabitCard 
                                key={habit.id}
                                habit={habit}
                                dateStr={selectedDateStr}
                                onToggle={() => onToggleHabit(habit.id, selectedDateStr)}
                                onClick={() => setSelectedHabitId(habit.id)}
                            />
                        ))}
                        
                        {/* Add New Card */}
                        <button 
                            onClick={() => setShowAddSheet(true)}
                            className="aspect-square rounded-[28px] border-2 border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-emerald-400 hover:text-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                <Plus size={24} />
                            </div>
                            <span className="font-bold text-sm">New Habit</span>
                        </button>
                    </div>
                </div>
            )}

            {filteredHabits.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 opacity-40 text-slate-400">
                    <Star size={64} className="mb-4 stroke-1" />
                    <p className="font-bold text-lg">No habits for this day</p>
                    <button 
                        onClick={() => setShowAddSheet(true)}
                        className="mt-6 px-6 py-3 bg-emerald-500 text-white rounded-full font-bold shadow-lg hover:bg-emerald-600 transition-colors"
                    >
                        Create First Habit
                    </button>
                </div>
            )}
        </div>

        <HabitFormSheet 
            isOpen={showAddSheet}
            onClose={() => setShowAddSheet(false)}
            onSave={(habit) => { onAddHabit(habit); setShowAddSheet(false); }}
        />
    </div>
  );
});

export default HabitView;
