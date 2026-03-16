import React from 'react';
import { Repeat } from 'lucide-react';
import { Task } from '../types';

const REPEAT_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
  { value: 'yearly', label: 'Every year' },
];

interface RecurringTaskUIProps {
  task: Task;
  onUpdate: (t: Task) => void;
}

export const RecurringTaskUI: React.FC<RecurringTaskUIProps> = ({ task, onUpdate }) => (
  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
    <Repeat size={18} className={task.repeat ? 'text-orange-500' : 'text-slate-400'} />
    <select
      value={task.repeat || ''}
      onChange={e => onUpdate({ ...task, repeat: e.target.value || undefined })}
      className="flex-1 bg-transparent text-sm font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer">
      {REPEAT_OPTIONS.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);
