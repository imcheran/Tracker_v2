import React, { useState, useRef, useEffect } from 'react';
import { Task, List, Priority } from '../types';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { X, Clock, MessageSquare, Paperclip, Zap, Share2, Trash2, Mic, Image as ImageIcon } from 'lucide-react';
import TaskDependencies from './TaskDependencies';

interface TaskDetailViewProps {
  task: Task;
  lists: List[];
  tasks?: Task[]; 
  onClose: () => void;
  onUpdateTask: (task: Task) => void;
  onAddTask?: (task: Task) => void;
  onDeleteTask: (taskId: string) => void; 
  onSelectTask?: (taskId: string) => void;
  onStartFocus?: (taskId: string) => void;
  settings?: any;
}

const KEEP_COLORS = [
  { color: '#ffffff', name: 'Default' },
  { color: '#fecaca', name: 'Red' },
  { color: '#fed7aa', name: 'Orange' },
  { color: '#fef08a', name: 'Yellow' },
  { color: '#bbf7d0', name: 'Green' },
  { color: '#bfdbfe', name: 'Blue' },
  { color: '#e9d5ff', name: 'Purple' },
  { color: '#fbcfe8', name: 'Pink' },
  { color: '#e2e8f0', name: 'Slate' },
];

const TaskDetailView: React.FC<TaskDetailViewProps> = ({ 
    task, lists, tasks = [], onClose, onUpdateTask, onDeleteTask, onAddTask, onSelectTask, onStartFocus
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [noteColor, setNoteColor] = useState(task.color || '#ffffff');
  
  const [showOptions, setShowOptions] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const childTasks = tasks.filter(t => t.parentId === task.id && !t.isDeleted);
  const allLists = [{ id: 'inbox', name: 'Inbox', color: '#3b82f6' }, ...lists];

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setNoteColor(task.color || '#ffffff');
  }, [task.id]);

  const handleSave = (updatedFields: Partial<Task> = {}) => {
    onUpdateTask({
      ...task,
      title,
      description,
      color: noteColor,
      updatedAt: new Date(),
      ...updatedFields
    });
  };

  const handleToggleComplete = () => {
    handleSave({ isCompleted: !task.isCompleted });
  };

  const handleToggleVoiceRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const id = Date.now().toString();
        const newAtt = { id, url, title: `Voice ${new Date().toLocaleTimeString()}`, type: 'audio' as const };
        handleSave({ attachments: [...(task.attachments || []), newAtt] });
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Mic access denied', err);
      alert('Microphone access is required to record voice notes.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              const newAttachment = { id: Date.now().toString(), title: file.name, type: 'image' as const, url: base64String };
              onUpdateTask({ ...task, attachments: [...(task.attachments || []), newAttachment] });
          };
          reader.readAsDataURL(file);
      }
  };

  const handleAddChecklistItem = () => {
      if (!onAddTask) return;
      
      const newId = Date.now().toString();
      const newChildTask: Task = {
          id: newId,
          parentId: task.id,
          title: '',
          isCompleted: false,
          priority: Priority.None,
          listId: task.listId,
          tags: [],
          subtasks: [],
          attachments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          isNote: true
      };
      
      onAddTask(newChildTask);
  };

  const handleUpdateChildTitle = (childId: string, newTitle: string) => {
      const child = childTasks.find(t => t.id === childId);
      if (child) {
          onUpdateTask({ ...child, title: newTitle });
      }
  };

  const handleChildToggle = (childId: string) => {
      const child = childTasks.find(t => t.id === childId);
      if (child) {
          onUpdateTask({ ...child, isCompleted: !child.isCompleted });
      }
  };

  const cyclePriority = () => {
      const next = (task.priority + 1) % 4;
      handleSave({ priority: next });
  };

  const getPriorityColor = (p: Priority) => {
      switch (p) {
          case Priority.High: return 'text-red-500';
          case Priority.Medium: return 'text-amber-500';
          case Priority.Low: return 'text-indigo-500';
          default: return 'text-slate-400';
      }
  };

  const getPriorityLabel = (p: Priority) => {
      switch (p) {
          case Priority.High: return 'High Priority';
          case Priority.Medium: return 'Medium Priority';
          case Priority.Low: return 'Low Priority';
          default: return 'No Priority';
      }
  };

  const formatDueDate = (date?: Date) => {
      if (!date) return 'Set Date';
      if (isToday(new Date(date))) return 'Today';
      if (isTomorrow(new Date(date))) return 'Tomorrow';
      if (isYesterday(new Date(date))) return 'Yesterday';
      return format(new Date(date), 'MMM d');
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const dateVal = e.target.value ? new Date(e.target.value) : undefined;
      handleSave({ dueDate: dateVal });
  };

  const textColorClass = noteColor === '#ffffff' || noteColor === '#fecaca' || noteColor === '#fed7aa' || noteColor === '#fef08a' || noteColor === '#bbf7d0' || noteColor === '#bfdbfe' || noteColor === '#e9d5ff' || noteColor === '#fbcfe8' || noteColor === '#e2e8f0'
    ? 'text-slate-900 placeholder:text-slate-400' 
    : 'text-white placeholder:text-white/50';

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col bg-white dark:bg-slate-950 animate-in slide-in-from-right sm:slide-in-from-bottom sm:duration-300 duration-200 border-t-4 border-blue-500`} style={{ backgroundColor: noteColor }}>
      
      {/* Full Screen Image Preview */}
      {fullScreenImage && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200" onClick={() => setFullScreenImage(null)}>
              <div className="h-16 flex items-center justify-between px-4 bg-transparent absolute top-0 left-0 right-0 z-10 pt-safe">
                  <span className="text-white text-sm font-medium">Image Preview</span>
                  <button onClick={() => setFullScreenImage(null)} className="text-white hover:text-slate-300">
                      <X size={24} />
                  </button>
              </div>
              <div className="flex-1 flex items-center justify-center p-4">
                  <img src={fullScreenImage} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg" alt="Preview" />
              </div>
          </div>
      )}

      {/* Top Bar */}
      <div className="pt-safe shrink-0 sticky top-0 z-20 bg-white/0 backdrop-blur-sm transition-colors px-6 py-4 flex items-center justify-between border-b border-black/5">
        <div className="flex items-center gap-3 flex-1">
          <button 
            onClick={handleToggleComplete}
            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
              task.isCompleted ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300 hover:border-blue-400'
            }`}
          >
            {task.isCompleted && <div className="w-3 h-2 border-b-2 border-l-2 border-white -rotate-45" />}
          </button>
          <input
            ref={titleInputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => handleSave()}
            className={`flex-1 text-lg font-bold bg-transparent border-none outline-none ${textColorClass}`}
          />
        </div>
        <button onClick={onClose} className={`text-slate-400 hover:text-slate-600 text-xl`}>✕</button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10 px-6 pb-32">
          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => handleSave()}
            placeholder="Add description..."
            className={`w-full mt-4 text-sm bg-transparent border-none outline-none resize-none ${textColorClass}`}
            rows={3}
          />

          {/* Metadata */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Clock size={18} className={getPriorityColor(task.priority)} />
              <span className="text-sm font-medium">{getPriorityLabel(task.priority)}</span>
              <button 
                onClick={cyclePriority}
                className="text-xs ml-auto px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                Change
              </button>
            </div>

            {task.dueDate && (
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-blue-500" />
                <span className="text-sm">{formatDueDate(task.dueDate)}</span>
                <input
                  type="date"
                  value={task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : ''}
                  onChange={handleDateChange}
                  className="ml-auto text-xs px-2 py-1 rounded-lg bg-white/10 border border-white/20 outline-none"
                />
              </div>
            )}
          </div>

          {/* Attachments */}
          {(task.attachments || []).length > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-60">Attachments</h3>
              <div className="flex flex-wrap gap-2">
                {task.attachments.map(att => (
                  <div
                    key={att.id}
                    onClick={() => att.type === 'image' && setFullScreenImage(att.url)}
                    className={`relative rounded-lg overflow-hidden ${att.type === 'image' ? 'cursor-pointer' : ''}`}
                  >
                    {att.type === 'image' && (
                      <img src={att.url} alt={att.title} className="h-20 w-20 object-cover rounded-lg hover:opacity-80" />
                    )}
                    {att.type === 'audio' && (
                      <audio controls className="w-full mt-2" src={att.url} />
                    )}
                    {att.type === 'drawing' && (
                      <img src={att.url} alt={att.title} className="h-20 w-20 object-cover rounded-lg hover:opacity-80" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks */}
          {childTasks.length > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-60">Subtasks</h3>
              {childTasks.map(child => (
                <div key={child.id} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                  <button
                    onClick={() => handleChildToggle(child.id)}
                    className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      child.isCompleted ? 'bg-blue-500 border-blue-500' : 'border-slate-300'
                    }`}
                  >
                    {child.isCompleted && <div className="w-2 h-1.5 border-b border-l border-white -rotate-45" />}
                  </button>
                  <input
                    type="text"
                    value={child.title}
                    onChange={(e) => handleUpdateChildTitle(child.id, e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-sm"
                    placeholder="Untitled"
                  />
                  <button
                    onClick={() => onDeleteTask(child.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors text-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddChecklistItem}
                className="w-full text-left text-sm text-slate-500 hover:text-slate-700 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors"
              >
                + Add subtask
              </button>
            </div>
          )}

          {/* Dependencies */}
          {(task.linkedTasks || []).length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-2">Dependencies</h3>
              <TaskDependencies task={task} allTasks={tasks} onUpdate={onUpdateTask} />
            </div>
          )}
      </div>

      {/* Bottom Bar */}
      <div className="h-16 border-t border-black/5 dark:border-white/5 flex items-center justify-between px-4 shrink-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl relative z-20 pb-safe">
          <div className="flex gap-2">
            <button
              onClick={handleToggleVoiceRecord}
              className={`p-2 rounded-lg transition-colors ${isRecording ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'}`}
            >
              <Mic size={18} />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
            >
              <ImageIcon size={18} />
            </button>
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
            >
              🎨
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => onDeleteTask(task.id)}
              className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
      </div>

      {/* Color Picker */}
      {showColorPicker && (
          <div className="absolute bottom-24 left-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/20 dark:border-slate-800 rounded-3xl p-5 z-30 shadow-2xl">
              <div className="grid grid-cols-5 gap-2">
                {KEEP_COLORS.map(({ color, name }) => (
                  <button
                    key={color}
                    onClick={() => { setNoteColor(color); handleSave({ color }); setShowColorPicker(false); }}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      noteColor === color ? 'border-blue-500 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    title={name}
                  />
                ))}
              </div>
          </div>
      )}
    </div>
  );
};

// Calendar icon placeholder
const Calendar = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

export default TaskDetailView;
