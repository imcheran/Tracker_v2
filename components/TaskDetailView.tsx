import React, { useState, useRef, useEffect } from 'react';
import { Task, List, Priority } from '../types';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { X, Clock, MessageSquare, Paperclip, Zap, Share2, Trash2, Mic, Image as ImageIcon, GripVertical, Plus, Check, Palette, Bell, Flag, FolderOpen, Eye, EyeOff } from 'lucide-react';
import DrawingCanvas from './DrawingCanvas';
import { NoteBackground } from './NoteBackgrounds';
import ShareModal from './ShareModal';

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
}

const NOTE_THEMES = [
  { id: 'dots', name: 'Dots' },
  { id: 'grid', name: 'Grid' },
  { id: 'lines', name: 'Lines' },
  { id: 'none', name: 'Solid' }
];

const KEEP_COLORS = [
  '#ffffff', '#fecaca', '#fed7aa', '#fef08a', '#bbf7d0', '#bfdbfe', '#e9d5ff', '#fbcfe8',
];

const TaskDetailView: React.FC<TaskDetailViewProps> = ({ 
  task, lists, tasks = [], onClose, onUpdateTask, onDeleteTask, onAddTask, onSelectTask
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority);
  const [listId, setListId] = useState(task.listId);
  const [color, setColor] = useState(task.color || '#ffffff');
  const [dueDate, setDueDate] = useState(task.dueDate ? new Date(task.dueDate) : null);
  const [isCompleted, setIsCompleted] = useState(task.isCompleted);
  const [isPinned, setIsPinned] = useState(task.isPinned || false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [attachments, setAttachments] = useState(task.attachments || []);
  const [subtasks, setSubtasks] = useState(task.subtasks || []);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [backgroundImage, setBackgroundImage] = useState(task.backgroundImage || 'none');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDark = document.documentElement.classList.contains('dark');
  const childTasks = tasks.filter(t => t.parentId === task.id && !t.isDeleted);
  const allLists = [{ id: 'inbox', name: 'Inbox', color: '#3b82f6' }, ...lists];
  const currList = allLists.find(l => l.id === listId) || allLists[0];

  const handleSave = () => {
    const updatedTask = {
      ...task,
      title,
      description,
      priority,
      listId,
      color,
      dueDate,
      isCompleted,
      isPinned,
      attachments,
      subtasks,
      backgroundImage,
      updatedAt: new Date()
    };
    onUpdateTask(updatedTask);
    onClose();
  };

  const handleAddSubtask = () => {
    if (newSubtaskText.trim()) {
      const newSubtask: Task = {
        id: Date.now().toString(),
        title: newSubtaskText,
        isCompleted: false,
        priority: Priority.None,
        listId: task.listId,
        tags: [],
        attachments: [],
        parentId: task.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      if (onAddTask) onAddTask(newSubtask);
      setNewSubtaskText('');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const url = evt.target?.result as string;
        setAttachments([...attachments, {
          id: Date.now().toString(),
          title: file.name,
          type: 'image',
          url
        }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
      <div className="fixed right-0 top-0 bottom-0 w-full md:w-[500px] bg-white dark:bg-slate-900 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Task Details</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Title & Completion */}
          <div className="flex gap-3">
            <button
              onClick={() => setIsCompleted(!isCompleted)}
              className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {isCompleted && <Check size={16} />}
            </button>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`flex-1 text-xl font-bold bg-transparent border-none outline-none ${
                isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'
              }`}
            />
          </div>

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add details..."
            className="w-full px-4 py-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
            rows={4}
          />

          {/* Priority Picker */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Priority</label>
            <div className="flex gap-2">
              {[Priority.None, Priority.Low, Priority.Medium, Priority.High].map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                    priority === p
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {p === Priority.None ? 'None' : ['Low', 'Medium', 'High'][p]}
                </button>
              ))}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Due Date</label>
            <input
              type="date"
              value={dueDate ? format(dueDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value) : null)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* List Selection */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">List</label>
            <select
              value={listId}
              onChange={(e) => setListId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {allLists.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Color Picker (for notes) */}
          {task.isNote && (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Color</label>
              <div className="flex gap-2 flex-wrap">
                {KEEP_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${color === c ? 'border-blue-500 scale-110' : 'border-slate-300'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Background Theme (for notes) */}
          {task.isNote && (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Theme</label>
              <select
                value={backgroundImage}
                onChange={(e) => setBackgroundImage(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {NOTE_THEMES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Subtasks */}
          {subtasks.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Subtasks</label>
              <div className="space-y-2">
                {subtasks.map(sub => (
                  <div key={sub.id} className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <GripVertical size={16} className="text-slate-400 cursor-move" />
                    <input
                      type="checkbox"
                      checked={sub.isCompleted}
                      onChange={(e) => {
                        const updated = subtasks.map(s => s.id === sub.id ? {...s, isCompleted: e.target.checked} : s);
                        setSubtasks(updated);
                      }}
                      className="rounded"
                    />
                    <span className={sub.isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}>
                      {sub.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Subtask */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubtaskText}
              onChange={(e) => setNewSubtaskText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
              placeholder="Add subtask..."
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
            />
            <button
              onClick={handleAddSubtask}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Attachments</label>
              <div className="grid grid-cols-3 gap-2">
                {attachments.map(att => (
                  <div key={att.id} className="relative group">
                    {att.type === 'image' && (
                      <img src={att.url} alt="attachment" className="w-full h-24 object-cover rounded-lg cursor-pointer" onClick={() => setImagePreview(att.url)} />
                    )}
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Attachment Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <ImagePlus size={18} /> Image
            </button>
            <button
              onClick={() => setShowDrawing(true)}
              className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <Pen size={18} /> Draw
            </button>
          </div>

          {showDrawing && <DrawingCanvas />}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} hidden />
        </div>

        {/* Footer */}
        <div className="shrink-0 flex gap-3 p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800">
          <button
            onClick={() => onDeleteTask(task.id)}
            className="px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            <Trash2 size={18} />
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all font-medium"
          >
            Save
          </button>
        </div>

        {/* Image Preview Modal */}
        {imagePreview && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => setImagePreview(null)}>
            <img src={imagePreview} alt="preview" className="max-h-96 max-w-2xl rounded-lg" />
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskDetailView;
