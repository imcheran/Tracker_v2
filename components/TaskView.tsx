import React, { useState, useRef } from 'react';
import { Task, List, Priority, ViewType } from '../types';
import { startOfDay, startOfToday, isBefore, isSameDay, addDays, isBefore as dateIsBefore } from 'date-fns';
import TaskItem from './TaskItem';
import TaskDetailView from './TaskDetailView';
import TaskInputSheet from './TaskInputSheet';

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
  onChangeView?: (view: ViewType | string) => void;
  settings?: any;
  habits?: any[];
  onUpdateHabit?: (habit: any) => void;
  user?: any;
}

const isPast = (date: Date) => dateIsBefore(date, new Date());

const TaskView: React.FC<TaskViewProps> = ({ 
    tasks, lists, viewType, searchQuery, onToggleTask, onAddTask, onUpdateTask, onSelectTask, onDeleteTask, onMenuClick, habits, onUpdateHabit, user
}) => {
  const [showInputSheet, setShowInputSheet] = useState(false);
  const [inputInitialMode, setInputInitialMode] = useState<'text' | 'list' | 'voice' | 'image' | 'drawing'>('text');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isGridView, setIsGridView] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [taskToEditDate, setTaskToEditDate] = useState<Task | undefined>(undefined);

  const isNotesView = viewType === ViewType.Notes;
  const isSelectionMode = selectedNoteIds.size > 0;

  const handleLongPressNote = (id: string) => {
      const newSet = new Set(selectedNoteIds);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedNoteIds(newSet);
  };

  const handleNoteClick = (id: string) => {
      if (isSelectionMode) {
          handleLongPressNote(id);
      } else {
          setSelectedTaskId(id);
      }
  };

  const createBlankNote = (mode: 'text' | 'list' | 'voice' | 'image' | 'drawing' = 'text') => {
      const newId = Date.now().toString();
      const newTask: Task = {
          id: newId,
          title: '',
          description: '',
          isCompleted: false,
          priority: Priority.None,
          listId: 'notes', 
          tags: [],
          subtasks: [],
          attachments: [],
          isNote: true,
          color: '#ffffff',
          createdAt: new Date(),
          updatedAt: new Date()
      };
      
      onAddTask(newTask);
      onSelectTask(newId);
  };

  const handleBulkUpdate = (updates: Partial<Task>) => {
      selectedNoteIds.forEach(id => {
          const task = tasks.find(t => t.id === id);
          if (task) onUpdateTask({ ...task, ...updates });
      });
      setSelectedNoteIds(new Set());
  };

  // Filter Logic
  const filteredTasks = tasks.filter(task => {
      if (task.isDeleted) return false;

      const showEvents = 
        viewType === ViewType.All || 
        viewType === ViewType.Today || 
        viewType === ViewType.Next7Days || 
        viewType === ViewType.Search;

      if (task.isEvent && !showEvents) return false;
      
      const matchesSearch = searchQuery 
        ? (task.title.toLowerCase().includes(searchQuery.toLowerCase()) || task.description?.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;

      if (!matchesSearch) return false;
      
      const today = startOfDay(new Date());
      
      if (isNotesView) return task.isNote;

      if (task.isNote && viewType !== ViewType.All && viewType !== ViewType.Trash && viewType !== ViewType.Search && viewType !== ViewType.Tags) {
          return false;
      }
      
      if (task.parentId) return false;

      switch (viewType) {
          case ViewType.Inbox:
              return task.listId === 'inbox' && !task.isCompleted;
          case ViewType.Today:
              return task.dueDate && isSameDay(new Date(task.dueDate), today) && !task.isCompleted;
          case ViewType.Next7Days:
              return task.dueDate && task.dueDate >= today && task.dueDate <= addDays(today, 7) && !task.isCompleted;
          case ViewType.Completed:
              return task.isCompleted;
          case ViewType.Trash:
              return task.isDeleted;
          case ViewType.All:
              return !task.isCompleted;
          case ViewType.Search:
              return !task.isCompleted;
          default:
              return task.listId === viewType && !task.isCompleted;
      }
  }).sort((a, b) => {
      if (viewType === ViewType.Completed) {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (isNotesView) {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if ((viewType === ViewType.Today || viewType === ViewType.Next7Days || viewType === ViewType.All) && a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.priority !== b.priority) return b.priority - a.priority;
      if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      return 0;
  });

  const getHeaderTitle = () => {
      if (searchQuery) return `Search: ${searchQuery}`;
      switch (viewType) {
          case ViewType.Inbox: return 'Inbox';
          case ViewType.Today: return 'Today';
          case ViewType.Next7Days: return 'Next 7 Days';
          case ViewType.Completed: return 'Completed';
          case ViewType.Notes: return 'Notes';
          case ViewType.Trash: return 'Trash';
          default: return 'All Tasks';
      }
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-slate-50 dark:bg-slate-950 transition-colors">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{getHeaderTitle()}</h1>
            <div className="flex gap-2">
                {onMenuClick && (
                    <button onClick={onMenuClick} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">
                        ☰
                    </button>
                )}
            </div>
        </div>

        {/* Task List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 text-slate-400">
                    <div className="text-5xl">📭</div>
                    <p className="text-center">No tasks yet. Create one to get started!</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredTasks.map(task => (
                        <TaskItem
                            key={task.id}
                            task={task}
                            onToggle={onToggleTask}
                            onSelect={() => setSelectedTaskId(task.id)}
                            selected={selectedTaskId === task.id}
                        />
                    ))}
                </div>
            )}
        </div>

        {/* Floating Action Button */}
        <button
            onClick={() => {
                setInputInitialMode('text');
                setShowInputSheet(true);
            }}
            className="fixed bottom-8 right-8 z-40 w-14 h-14 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95"
        >
            +
        </button>

        {/* Task Detail View */}
        {selectedTaskId && (
            <TaskDetailView
                task={tasks.find(t => t.id === selectedTaskId)!}
                lists={lists}
                tasks={tasks}
                onClose={() => setSelectedTaskId(null)}
                onUpdateTask={onUpdateTask}
                onAddTask={onAddTask}
                onDeleteTask={() => {
                    if (onDeleteTask) onDeleteTask(selectedTaskId);
                    setSelectedTaskId(null);
                }}
                onSelectTask={setSelectedTaskId}
                onStartFocus={() => {}}
            />
        )}

        {/* Task Input Sheet */}
        <TaskInputSheet 
            isOpen={showInputSheet}
            onClose={() => setShowInputSheet(false)}
            onAddTask={onAddTask}
            lists={lists}
            initialMode={inputInitialMode}
            initialConfig={{ 
                listId: (!isNotesView && viewType !== ViewType.Inbox && viewType !== ViewType.Today && viewType !== ViewType.Next7Days && viewType !== ViewType.Completed && viewType !== ViewType.All) ? viewType as string : 'inbox',
                isNote: isNotesView 
            }}
        />

        {/* Date Edit Sheet */}
        <TaskInputSheet 
            isOpen={!!taskToEditDate}
            onClose={() => setTaskToEditDate(undefined)}
            onAddTask={(updatedTask) => {
                onUpdateTask(updatedTask);
            }} 
            lists={lists}
            existingTask={taskToEditDate}
            activePicker='date'
        />
    </div>
  );
};

export default TaskView;
