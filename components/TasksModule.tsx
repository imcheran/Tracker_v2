// ═══════════════════════════════════════════════════════════════════════════════════
// TASKS MODULE - Consolidated Tasks Components
// Combines: TaskView, TaskDetailView, TaskInputSheet, TaskItem
// ═══════════════════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Task, Priority, ViewType, List, AppSettings, Habit } from '../types';
import { 
  CheckCircle2, Plus, Inbox, Search, Layers, Archive, Sun, CalendarDays, Trash2, Menu,
  MoreVertical, Check, X, Notebook, Pin, Image as ImageIcon, ChevronDown,
  Palette, Clock, ListTodo, Hash, Lock, PenTool, Mic, Type, MousePointer2, Sparkles, Loader2, Users, LayoutGrid, List as ListIcon,
  Calendar, FolderInput, ArrowRight, Eye, EyeOff, Circle, Grid, LayoutList, CheckSquare, Brush, Target, MapPin,
  Flag, Tag as TagIcon, CircleX, ChevronLeft, ChevronRight, Circle as CircleIcon, Share2, Edit2, 
  Repeat, Bell, FileAudio, StopCircle, Timer, Zap, Mic as MicIcon, Timer as TimerIcon, ArrowUp,
  CheckCircle2 as CheckCircle2Icon
} from 'lucide-react';
import { 
  format, isSameDay, addDays, isBefore, isToday, isTomorrow, isAfter, startOfDay, addMinutes,
  differenceInMinutes, getDay, addMonths, subMonths, eachDayOfInterval, isSameMonth,
  isYesterday, getDaysInMonth, parseISO
} from 'date-fns';
import DrawingCanvas from './DrawingCanvas';
import { NoteBackground } from './NoteBackgrounds';

// ═══════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════════

const isPast = (date: Date) => isBefore(date, new Date());

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);
const startOfWeek = (date: Date, options?: { weekStartsOn?: number }) => {
    const day = getDay(date);
    const startDay = options?.weekStartsOn || 0;
    const diff = (day < startDay ? 7 : 0) + day - startDay;
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    result.setDate(result.getDate() - diff);
    return result;
};
const endOfWeek = (date: Date, options?: { weekStartsOn?: number }) => {
    const start = startOfWeek(date, options);
    const result = new Date(start);
    result.setDate(result.getDate() + 6);
    result.setHours(23, 59, 59, 999);
    return result;
};

// ═══════════════════════════════════════════════════════════════════════════════════
// TASK ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  selected: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onToggle, onSelect, selected }) => {
  const priorityColor = {
    [Priority.High]: 'text-red-500',
    [Priority.Medium]: 'text-yellow-500',
    [Priority.Low]: 'text-blue-500',
    [Priority.None]: 'text-slate-300'
  };

  const isOverdue = task.dueDate && 
    isBefore(new Date(task.dueDate), new Date()) && 
    !isSameDay(new Date(task.dueDate), new Date()) && 
    !task.isCompleted;

  return (
    <div 
      onClick={() => onSelect(task.id)}
      className={`group flex items-start gap-3 p-3 rounded-lg border-b border-slate-100 cursor-pointer transition-all hover:shadow-md
        ${selected ? 'bg-blue-50 border-blue-100' : 'bg-white hover:bg-slate-50'}
        ${task.isCompleted ? 'opacity-60' : ''}
      `}
    >
      <div className="pt-1">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
            ${task.isCompleted 
                ? 'bg-blue-500 border-blue-500' 
                : `border-slate-300 hover:border-blue-500 ${ priorityColor[task.priority].replace('text-', 'border-')}`
            }
          `}
        >
          {task.isCompleted && <div className="w-2.5 h-1.5 border-b-2 border-l-2 border-white -rotate-45 -mt-0.5" />}
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${task.isCompleted ? 'line-through text-slate-500' : 'text-slate-800'}`}>
            {task.title}
        </div>
        
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            {task.dueDate && (
                <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                    <Calendar size={12} />
                    <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                </div>
            )}
            
            {task.tags.length > 0 && (
                <div className="flex items-center gap-1">
                    <TagIcon size={12} />
                    <span className="truncate max-w-[100px]">{task.tags.join(', ')}</span>
                </div>
            )}

            <Flag size={12} className={priorityColor[task.priority]} />
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════════
// SWIPEABLE WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════════

const SwipeableWrapper: React.FC<{
  children: React.ReactNode;
  onTriggerLeft: () => void;
  onTriggerRight: () => void;
  enabled: boolean;
}> = ({ children, onTriggerLeft, onTriggerRight, enabled }) => {
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const isDragging = useRef(false);

  if (!enabled) return <>{children}</>;

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    if (Math.abs(diff) < 150) {
        setOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    if (offset > 80) {
        onTriggerRight();
    } else if (offset < -80) {
        onTriggerLeft();
    }
    setOffset(0);
  };

  const opacity = Math.min(Math.abs(offset) / 80, 1);

  return (
    <div className="relative overflow-hidden rounded-[24px]">
      <div className={`absolute inset-0 flex items-center justify-between px-6 text-white transition-colors ${offset > 0 ? 'bg-blue-500' : 'bg-orange-500'}`}>
         <div style={{ opacity: offset > 0 ? opacity : 0 }} className="font-bold flex items-center gap-2">
             <CheckCircle2 size={24} /> 
             <span className="text-sm uppercase tracking-wider">Complete</span>
         </div>
         <div style={{ opacity: offset < 0 ? opacity : 0 }} className="font-bold flex items-center gap-2">
             <span className="text-sm uppercase tracking-wider">Schedule</span>
             <Calendar size={24} />
         </div>
      </div>
      <div 
        className="relative transition-transform duration-200 ease-out bg-white dark:bg-slate-950"
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════════
// BENTO TASK CARD
// ═══════════════════════════════════════════════════════════════════════════════════

interface BentoTaskCardProps {
    task: Task;
    onToggle: () => void;
    onSelect: () => void;
    onDelete: () => void;
    isSimplified?: boolean;
}

const BentoTaskCard: React.FC<BentoTaskCardProps> = ({ task, onToggle, onSelect, onDelete, isSimplified }) => {
    const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && !isSameDay(new Date(task.dueDate), new Date()) && !task.isCompleted;
    
    if (task.isEvent) {
        return (
            <div 
                onClick={onSelect}
                className="group relative bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/40 dark:to-purple-900/40 border border-indigo-100 dark:border-indigo-800/50 p-5 rounded-[24px] bento-card cursor-pointer overflow-hidden flex flex-col justify-between min-h-[140px] shadow-sm hover:shadow-indigo-500/10 transition-all duration-300"
            >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="bg-white/80 dark:bg-black/40 backdrop-blur-sm p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-500 transition-colors shadow-sm">
                        <Trash2 size={16} />
                    </button>
                </div>
                <div className="relative z-0">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 p-1.5 rounded-lg">
                            <Calendar size={16} />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Event</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-tight line-clamp-2">{task.title}</h3>
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                    {task.dueDate && (
                        <div className="bg-white/60 dark:bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-indigo-100/50 dark:border-white/5">
                            {isToday(new Date(task.dueDate)) ? 'Today' : format(new Date(task.dueDate), 'MMM d')}
                            {!task.isAllDay && ` • ${format(new Date(task.dueDate), 'h:mm a')}`}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const priorityStyles = {
        [Priority.High]: 'bg-gradient-to-br from-red-50 to-white dark:from-red-900/20 dark:to-slate-900 border-red-100 dark:border-red-900/30 shadow-red-500/5',
        [Priority.Medium]: 'bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-900 border-amber-100 dark:border-amber-900/30 shadow-amber-500/5',
        [Priority.Low]: 'bg-gradient-to-br from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-900 border-blue-100 dark:border-blue-900/30 shadow-blue-500/5',
        [Priority.None]: 'bg-gradient-to-br from-white to-slate-50 dark:from-slate-800/50 dark:to-slate-900 border-slate-100 dark:border-slate-800'
    };

    return (
        <div 
            onClick={onSelect}
            className={`group relative p-5 rounded-[24px] border transition-all duration-300 bento-card cursor-pointer flex flex-col justify-between min-h-[120px] shadow-sm hover:shadow-lg hover:-translate-y-1 ${priorityStyles[task.priority]} ${task.isCompleted ? 'opacity-60 grayscale' : ''}`}
        >
            <div className="flex items-start justify-between gap-3">
                <h3 className={`text-base font-semibold leading-snug ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                    {task.title}
                </h3>
                <button 
                    onClick={(e) => { e.stopPropagation(); onToggle(); }}
                    className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-sm ${task.isCompleted ? 'bg-slate-400 border-slate-400 text-white' : 'border-slate-300 hover:border-blue-500 bg-white dark:bg-transparent'}`}
                >
                    {task.isCompleted && <Check size={14} strokeWidth={3} />}
                </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
                {task.dueDate && (
                    <div className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg ${isOverdue ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300' : 'bg-white/80 dark:bg-white/10 text-slate-500 dark:text-slate-400'}`}>
                        <Calendar size={12} />
                        <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                    </div>
                )}
                
                {task.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-bold bg-white/80 dark:bg-white/10 px-2.5 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-transparent">#{tag}</span>
                ))}
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════════════
// TASK INPUT SHEET (SIMPLIFIED)
// ═══════════════════════════════════════════════════════════════════════════════════

interface TaskInputSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Task) => void;
  lists: List[];
  initialConfig?: Partial<Task>;
  existingTask?: Task;
}

const TaskInputSheet: React.FC<TaskInputSheetProps> = ({ isOpen, onClose, onAddTask, lists, initialConfig }) => {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.None);
  const [listId, setListId] = useState<string>('inbox');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setPriority(Priority.None);
      setListId('inbox');
      setDueDate(undefined);
    }
  }, [isOpen]);

  const handleAdd = () => {
    if (!title.trim()) return;
    onAddTask({
      id: Date.now().toString(),
      title: title.trim(),
      priority,
      listId,
      dueDate,
      isCompleted: false,
      tags: [],
      subtasks: [],
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setTitle('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 space-y-4 animate-slide-up">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Add Task</h2>
        
        <input 
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title..."
          className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-400"
          autoFocus
        />
        
        <div className="grid grid-cols-2 gap-3">
          <select 
            value={priority} 
            onChange={(e) => setPriority(parseInt(e.target.value))}
            className="px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none"
          >
            <option value={Priority.None}>No Priority</option>
            <option value={Priority.Low}>Low</option>
            <option value={Priority.Medium}>Medium</option>
            <option value={Priority.High}>High</option>
          </select>
          
          <select 
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            className="px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none"
          >
            <option value="inbox">Inbox</option>
            {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        
        <input 
          type="date"
          onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value) : undefined)}
          className="w-full px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white outline-none"
        />

        <div className="flex gap-3 pt-4">
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-200 dark:border-white/10 rounded-lg text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleAdd}
            disabled={!title.trim()}
            className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════════
// TASK VIEW COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════

interface TaskViewProps {
  tasks: Task[];
  lists: List[];
  viewType: ViewType | string;
  searchQuery?: string;
  onToggleTask: (taskId: string) => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onSelectTask: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onMenuClick?: () => void;
  settings?: AppSettings;
  habits?: Habit[];
  user?: any;
}

const TaskView: React.FC<TaskViewProps> = ({ 
  tasks, lists, viewType, searchQuery = '', onToggleTask, onAddTask, onUpdateTask,
  onSelectTask, onDeleteTask, settings, habits, user
}) => {
  const [showInputSheet, setShowInputSheet] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => 
      !t.isDeleted &&
      (searchQuery === '' || t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [tasks, searchQuery]);

  const handleSelectTask = (id: string) => {
    if (selectedTasks.has(id)) {
      const newSet = new Set(selectedTasks);
      newSet.delete(id);
      setSelectedTasks(newSet);
    } else {
      setSelectedTasks(new Set([...selectedTasks, id]));
    }
  };

  return (
    <div className="flex-1 h-full bg-slate-50 dark:bg-slate-900 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <ListTodo size={48} className="mx-auto mb-4 opacity-50" />
            <p>No tasks yet. Create one to get started!</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <BentoTaskCard
              key={task.id}
              task={task}
              onToggle={() => onToggleTask(task.id)}
              onSelect={() => onSelectTask(task.id)}
              onDelete={() => onDeleteTask?.(task.id)}
            />
          ))
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setShowInputSheet(true)}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 flex items-center justify-center z-40"
      >
        <Plus size={24} />
      </button>

      <TaskInputSheet
        isOpen={showInputSheet}
        onClose={() => setShowInputSheet(false)}
        onAddTask={onAddTask}
        lists={lists}
      />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════════
// TASK DETAIL VIEW (SIMPLIFIED)
// ═══════════════════════════════════════════════════════════════════════════════════

interface TaskDetailViewProps {
  task: Task;
  lists: List[];
  tasks?: Task[]; 
  onClose: () => void;
  onUpdateTask: (task: Task) => void;
  onAddTask?: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const TaskDetailView: React.FC<TaskDetailViewProps> = ({ 
  task, lists, tasks = [], onClose, onUpdateTask, onDeleteTask
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [noteColor, setNoteColor] = useState(task.color || '#ffffff');
  const isDarkMode = document.documentElement.classList.contains('dark');

  const handleSave = () => {
    onUpdateTask({
      ...task,
      title,
      description,
      color: noteColor,
      updatedAt: new Date(),
    });
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col bg-white dark:bg-slate-950 animate-in slide-in-from-right border-t-4 border-blue-500`} style={{ backgroundColor: noteColor }}>
      <div className="flex items-center justify-between px-4 h-14 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm borderB">
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-800">
          <X size={20} />
        </button>
        <h2 className="font-bold text-slate-800 dark:text-white">Task Details</h2>
        <button onClick={handleSave} className="w-8 h-8 flex items-center justify-center text-blue-600 hover:text-blue-700">
          <Check size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase">Title</label>
          <input 
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full mt-2 px-4 py-2 bg-white/50 dark:bg-black/20 rounded-lg text-slate-800 dark:text-white outline-none focus:bg-white dark:focus:bg-black/40 text-lg font-bold"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full mt-2 px-4 py-2 bg-white/50 dark:bg-black/20 rounded-lg text-slate-800 dark:text-white outline-none focus:bg-white dark:focus:bg-black/40 resize-none min-h-[120px]"
            placeholder="Add notes..."
          />
        </div>

        <div className="flex gap-3 pt-6 border-t border-white/20">
          <button 
            onClick={() => onDeleteTask(task.id)}
            className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium"
          >
            Delete
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════════

export { 
  TaskView, 
  TaskDetailView, 
  TaskInputSheet, 
  TaskItem,
  BentoTaskCard,
  SwipeableWrapper
};

export default TaskView;
