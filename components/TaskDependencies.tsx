import React from 'react';
import { Lock, Unlock, Link2, X } from 'lucide-react';
import { Task } from '../types';

interface TaskDependenciesProps {
  task: Task;
  allTasks: Task[];
  onUpdate: (t: Task) => void;
}

export const TaskDependencies: React.FC<TaskDependenciesProps> = ({ task, allTasks, onUpdate }) => {
  const blockedBy = (task.linkedTasks || []).filter(id => allTasks.find(t => t.id === id && !t.isCompleted));
  const isBlocked = blockedBy.length > 0;
  const available = allTasks.filter(t => t.id !== task.id && !t.isDeleted && !t.isCompleted && !(task.linkedTasks || []).includes(t.id));

  const addDep = (depId: string) =>
    onUpdate({ ...task, linkedTasks: [...(task.linkedTasks || []), depId] });

  const removeDep = (depId: string) =>
    onUpdate({ ...task, linkedTasks: (task.linkedTasks || []).filter(id => id !== depId) });

  return (
    <div className="space-y-3">
      {isBlocked && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-3">
          <Lock size={14} className="text-rose-500 shrink-0" />
          <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
            Blocked by {blockedBy.length} task{blockedBy.length > 1 ? 's' : ''}
          </span>
        </div>
      )}
      {(task.linkedTasks || []).map(depId => {
        const dep = allTasks.find(t => t.id === depId);
        if (!dep) return null;
        return (
          <div key={depId} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 rounded-xl p-2.5">
            <Link2 size={13} className={dep.isCompleted ? 'text-teal-500' : 'text-amber-500'} />
            <span className={`flex-1 text-xs font-medium ${dep.isCompleted ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
              {dep.title}
            </span>
            <button onClick={() => removeDep(depId)} className="text-slate-300 hover:text-rose-400 transition-colors">
              <X size={13} />
            </button>
          </div>
        );
      })}
      {available.length > 0 && (
        <select
          onChange={e => { if (e.target.value) addDep(e.target.value); e.target.value = ''; }}
          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-400"
          defaultValue="">
          <option value="">+ Add dependency (blocked by)...</option>
          {available.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      )}
    </div>
  );
};

export default TaskDependencies;
