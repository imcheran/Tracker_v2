import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Task, Priority, List } from '../types';
import { Plus, Mic, ImagePlus, Pen, X, Send, Loader2, Calendar, Clock, Flag, CheckCircle2, Hash } from 'lucide-react';
import { format, addDays, addMinutes, setHours, setMinutes, differenceInMinutes } from 'date-fns';
import nlpService from '../services/nlpService';
import aiService from '../services/aiService';
import DrawingCanvas from './DrawingCanvas';
import WheelPicker from './WheelPicker';

interface TaskInputSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Task) => void;
  lists: List[];
  initialConfig?: Partial<Task>;
  activePicker?: 'none' | 'date' | 'priority' | 'list' | 'color';
  existingTask?: Task;
  initialMode?: 'text' | 'list' | 'voice' | 'image' | 'drawing';
}

type PickerView = 'none' | 'date' | 'priority' | 'list' | 'color'; 

const NOTE_COLORS = ['#ffffff', '#f28b82', '#fbbc04', '#fff475', '#ccff90', '#a7ffeb', '#cbf0f8', '#aecbfa', '#d7aefb', '#fdcfe8', '#e6c9a8', '#e8eaed'];

const TaskInputSheet: React.FC<TaskInputSheetProps> = ({ isOpen, onClose, onAddTask, lists, initialConfig, activePicker: initialPicker = 'none', existingTask, initialMode = 'text' }) => {
  // --- State ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activePicker, setActivePicker] = useState<PickerView>(initialPicker);
  
  const [priority, setPriority] = useState<Priority>(Priority.None);
  const [listId, setListId] = useState<string>('inbox');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [isNote, setIsNote] = useState(false);
  const [noteColor, setNoteColor] = useState('#ffffff');
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  
  const [attachments, setAttachments] = useState<Task['attachments']>([]);
  const [showDrawing, setShowDrawing] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  
  const [startHour, setStartHour] = useState('09');
  const [startMinute, setStartMinute] = useState('00');
  const [endHour, setEndHour] = useState('10');
  const [endMinute, setEndMinute] = useState('00');
  
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [reminder, setReminder] = useState<string>('None'); 
  const [repeat, setRepeat] = useState<string>('None');
  const [isAllDay, setIsAllDay] = useState(false);

  const [dateTab, setDateTab] = useState<'date' | 'time'>('date');
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  useEffect(() => {
    if (isOpen) {
      if (initialPicker !== 'none') {
        setActivePicker(initialPicker);
      }
      
      const config = existingTask || initialConfig;

      if (config) {
        setTitle(config.title || '');
        setDescription(config.description || '');
        setPriority(config.priority ?? Priority.None);
        setListId(config.listId || 'inbox');
        setDueDate(config.dueDate ? new Date(config.dueDate) : undefined);
        setIsNote(config.isNote ?? false);
        setNoteColor(config.color || '#ffffff');
        setAttachments(config.attachments || []);
        setParentId(config.parentId);
        setSelectedTags(config.tags || []);
      } else {
        resetState();
      }

      if (initialMode === 'voice') {
        setTimeout(() => startRecording(), 100);
      } else if (initialMode === 'image') {
        fileInputRef.current?.click();
      } else if (initialMode === 'drawing') {
        setShowDrawing(true);
      } else if (initialMode === 'text') {
        setTimeout(() => titleInputRef.current?.focus(), 100);
      }
    } else {
        if (isRecording) stopRecording();
    }
  }, [isOpen, initialConfig, existingTask, initialPicker, initialMode]);

  useEffect(() => {
      const start = parseInt(startHour) * 60 + parseInt(startMinute);
      const end = parseInt(endHour) * 60 + parseInt(endMinute);
      
      if (end <= start) {
          const newEndTotal = (start + 60) % 1440;
          const newEndH = Math.floor(newEndTotal / 60);
          const newEndM = newEndTotal % 60;
          setEndHour(newEndH.toString().padStart(2, '0'));
          setEndMinute(newEndM.toString().padStart(2, '0'));
      }
  }, [startHour, startMinute]);

  useEffect(() => {
      if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
      }
  }, [description]);

  const resetState = () => {
      setTitle('');
      setDescription('');
      setPriority(Priority.None);
      setListId('inbox');
      setDueDate(undefined);
      setIsNote(false);
      setNoteColor('#ffffff');
      setAttachments([]);
      setParentId(undefined);
      
      const now = new Date();
      now.setMinutes(0);
      now.setHours(now.getHours() + 1);
      setStartHour(now.getHours().toString().padStart(2, '0'));
      setStartMinute('00');
      
      const next = addMinutes(now, 60);
      setEndHour(next.getHours().toString().padStart(2, '0'));
      setEndMinute('00');
      
      setReminder('None');
      setRepeat('None');
      setIsAllDay(false);
      setSelectedTags([]);
      setActivePicker('none');
      setDateTab('date');
      setCalendarMonth(new Date());
      setShowDrawing(false);
      setIsProcessingVoice(false);
  };

  const durationText = useMemo(() => {
      const start = parseInt(startHour) * 60 + parseInt(startMinute);
      let end = parseInt(endHour) * 60 + parseInt(endMinute);
      if (end < start) end += 24 * 60; 
      
      const diff = end - start;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      
      if (h > 0 && m > 0) return `${h}h ${m}m`;
      if (h > 0) return `${h}h`;
      return `${m}m`;
  }, [startHour, startMinute, endHour, endMinute]);

  const handleAddTaskFn = () => {
      if (!title.trim() && attachments.length === 0) return;

      let parsedTitle = title;
      let parsedPriority = priority;
      let parsedDueDate = dueDate;
      let parsedTags = [...selectedTags];
      let parsedIsAllDay = isAllDay;

      let finalDate = parsedDueDate;
      let finalEndDate: Date | undefined = undefined;

      if (finalDate && !parsedIsAllDay) {
          const startH = parseInt(startHour);
          const startM = parseInt(startMinute);
          finalDate = setHours(setMinutes(finalDate, startM), startH);

          const endH = parseInt(endHour);
          const endM = parseInt(endMinute);
          finalEndDate = setHours(setMinutes(finalDate, endM), endH);
          
          if (endH < startH || (endH === startH && endM < startM)) {
              finalEndDate = addDays(finalEndDate, 1);
          }
      }

      let duration = 60;
      if (finalDate && finalEndDate) {
          duration = differenceInMinutes(finalEndDate, finalDate);
      }

      const taskToSave: Task = {
          id: existingTask ? existingTask.id : Date.now().toString(),
          parentId: parentId, 
          title: parsedTitle || "Untitled",
          description: description.trim(),
          isCompleted: existingTask ? existingTask.isCompleted : false,
          priority: parsedPriority,
          listId,
          tags: parsedTags,
          dueDate: finalDate,
          endDate: finalEndDate,
          duration: duration,
          isAllDay: parsedIsAllDay,
          subtasks: existingTask ? existingTask.subtasks : [],
          attachments: attachments,
          isNote: isNote,
          color: noteColor,
          reminder: reminder !== 'None' ? new Date() : undefined, 
          repeat: repeat !== 'None' ? repeat : undefined,
          isPinned: existingTask ? existingTask.isPinned : false,
          updatedAt: new Date(),
          createdAt: existingTask ? existingTask.createdAt : new Date(),
      };

      onAddTask(taskToSave);
      onClose(); 
      setTimeout(() => resetState(), 300);
  };

  const togglePicker = (view: PickerView) => {
      if (activePicker === view) {
          setActivePicker('none');
      } else {
          setActivePicker(view);
          if (view === 'date') {
              setDateTab('date');
          }
      }
  };

  const insertHash = () => {
    setTitle(prev => prev + (prev.length > 0 && !prev.endsWith(' ') ? ' #' : '#'));
    titleInputRef.current?.focus();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = async () => {
              const base64String = reader.result as string;
              const newAttachment = { 
                  id: Date.now().toString(), 
                  title: file.name, 
                  type: 'image' as const, 
                  url: base64String 
              };
              setAttachments(prev => [...prev, newAttachment]);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleSaveDrawing = (dataUrl: string) => {
      const newAttachment = { id: Date.now().toString(), title: "Drawing", type: 'drawing' as const, url: dataUrl };
      setAttachments(prev => [...prev, newAttachment]);
      setShowDrawing(false);
  };

  const startRecording = async () => {
      if (!navigator.mediaDevices) {
          alert("Microphone not accessible");
          return;
      }
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream);
          chunksRef.current = [];

          recorder.ondataavailable = (e) => {
              if (e.data.size > 0) chunksRef.current.push(e.data);
          };

          recorder.onstop = async () => {
              const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
              const base64 = await blobToBase64(blob);
              const newAttachment = { 
                  id: Date.now().toString(), 
                  title: `Voice ${new Date().toLocaleTimeString()}`, 
                  type: 'audio' as const, 
                  url: base64 
              };
              setAttachments(prev => [...prev, newAttachment]);
              stream.getTracks().forEach(track => track.stop());
              setIsProcessingVoice(false);
          };

          recorder.start();
          mediaRecorderRef.current = recorder;
          setIsRecording(true);
      } catch (err) {
          console.error('Mic access failed:', err);
          alert('Microphone access required');
      }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          setIsProcessingVoice(true);
      }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, _) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const removeAttachment = (id: string) => {
      setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const allLists = [{ id: 'inbox', name: 'Inbox', color: '#3b82f6' }, ...lists];
  const currentList = allLists.find(l => l.id === listId) || allLists[0];

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {existingTask ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 px-6 py-4 space-y-4">
          {/* Title Input */}
          <input
            ref={titleInputRef}
            type="text"
            placeholder="Task title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-lg font-semibold bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
          />

          {/* Description */}
          <textarea
            ref={textareaRef}
            placeholder="Add details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-sm resize-none border border-slate-200 dark:border-slate-700 outline-none focus:border-blue-400"
          />

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map(att => (
                <div key={att.id} className="relative bg-slate-100 dark:bg-slate-800 rounded-lg p-2 flex items-center gap-2 group">
                  <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[100px]">{att.title}</span>
                  <button
                    onClick={() => removeAttachment(att.id)}
                    className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Quick Action Buttons */}
          <div className="flex gap-2 flex-wrap pt-2">
            <button
              onClick={() => togglePicker('priority')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                priority !== Priority.None
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Priority: {priority === Priority.None ? 'None' : ['Low', 'Medium', 'High'][priority]}
            </button>

            <button
              onClick={() => togglePicker('date')}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                dueDate
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {dueDate ? format(dueDate, 'MMM d') : 'Add Date'}
            </button>

            <button
              onClick={() => togglePicker('list')}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            >
              {currentList.name}
            </button>

            {isNote && (
              <button
                onClick={() => togglePicker('color')}
                className="w-8 h-8 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-slate-400 transition-colors"
                style={{ backgroundColor: noteColor }}
              />
            )}
          </div>

          {/* Pickers */}
          {activePicker === 'priority' && (
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-2">
              {[Priority.None, Priority.Low, Priority.Medium, Priority.High].map(p => (
                <button
                  key={p}
                  onClick={() => { setPriority(p); setActivePicker('none'); }}
                  className="block w-full text-left px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors text-sm"
                >
                  {p === Priority.None ? 'No Priority' : ['Low', 'Medium', 'High'][p]}
                </button>
              ))}
            </div>
          )}

          {activePicker === 'list' && (
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-2">
              {allLists.map(list => (
                <button
                  key={list.id}
                  onClick={() => { setListId(list.id); setActivePicker('none'); }}
                  className="block w-full text-left px-3 py-2 rounded-lg hover:bg-white dark:hover:bg-slate-700 transition-colors text-sm flex items-center gap-2"
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: list.color }} />
                  {list.name}
                </button>
              ))}
            </div>
          )}

          {activePicker === 'color' && (
            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
              <div className="grid grid-cols-6 gap-2">
                {NOTE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => { setNoteColor(color); setActivePicker('none'); }}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      noteColor === color ? 'border-blue-500 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex gap-2 sticky bottom-0 bg-white dark:bg-slate-900">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleAddTaskFn}
            disabled={!title.trim() && attachments.length === 0}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50"
          >
            {existingTask ? 'Update' : 'Add Task'}
          </button>
        </div>
      </div>
    </>
  );
};

export default TaskInputSheet;
