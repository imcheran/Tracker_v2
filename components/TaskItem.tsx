import React from 'react';
import { Task, Priority } from '../types';
import { format, isSameDay, isBefore } from 'date-fns';
import { Calendar, Flag, Tag } from 'lucide-react';

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
    [Priority.Low]: 'text-indigo-500',
    [Priority.None]: 'text-slate-300'
  };

  const isOverdue = task.dueDate && 
    isBefore(new Date(task.dueDate), new Date()) && 
    !isSameDay(new Date(task.dueDate), new Date()) && 
    !task.isCompleted;

  return (
    <div 
      onClick={() => onSelect(task.id)}
      className={`
        group flex items-start gap-3 p-4 mb-3 rounded-[20px] border border-slate-100 dark:border-white/10 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
        ${selected ? 'bg-indigo-50/80 dark:bg-indigo-900/40 ring-2 ring-indigo-500/50' : 'bg-white/80 dark:bg-[#0f0f13]/80 hover:bg-white dark:hover:bg-[#1a1a20] backdrop-blur-xl'}
        ${task.isCompleted ? 'opacity-50 grayscale' : 'animate-fade-in'}
      `}
    >
      <div className="pt-1">
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
          className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-sm
            ${task.isCompleted 
                ? 'bg-indigo-500 border-indigo-500 text-white scale-95' 
                : `bg-white dark:bg-transparent border-slate-300 dark:border-slate-600 hover:border-indigo-500 hover:shadow-indigo-500/20`
            }
          `}
        >
          {task.isCompleted && <div className="w-3 h-2 border-b-[2.5px] border-l-[2.5px] border-white -rotate-45 -mt-0.5 animate-scale-in" />}
        </button>
      </div>

      <div className="flex-1 min-w-0">
        <div className={`text-[15px] font-semibold truncate transition-colors ${task.isCompleted ? 'line-through text-slate-400 dark:text-slate-600' : 'text-slate-800 dark:text-slate-100'}`}>
            {task.title}
        </div>
        
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400">
            {task.dueDate && (
                <div className={`flex items-center gap-1 font-bold px-2 py-1 rounded-md bg-slate-100 dark:bg-white/5 ${isOverdue ? 'text-red-500 bg-red-50 dark:bg-red-500/10' : ''}`}>
                    <Calendar size={12} />
                    <span>{format(new Date(task.dueDate), 'MMM d')}</span>
                </div>
            )}
            
            {task.tags.length > 0 && (
                <div className="flex items-center gap-1 font-bold px-2 py-1 rounded-md bg-slate-100 dark:bg-white/5">
                    <Tag size={12} />
                    <span className="truncate max-w-[100px]">{task.tags.join(', ')}</span>
                </div>
            )}

            {task.priority !== Priority.None && (
                <div className={`flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 dark:bg-white/5 ${priorityColor[task.priority]}`}>
                    <Flag size={12} strokeWidth={3} />
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default TaskItem;
