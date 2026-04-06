import React, { useState, useRef, useEffect } from 'react';
import { Task, Priority, List } from '../types';
import { Plus, Mic, ImagePlus, Pen, X, Send, Loader2, Calendar, Clock, Flag, CheckCircle2, Hash } from 'lucide-react';
import { format, addDays, addHours } from 'date-fns';
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

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isVoiceRecording) {
      mediaRecorderRef.current.stop();
      setIsVoiceRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const transcribedText = await aiService.transcribeAudio(audioBlob);
      setTitle(prev => prev + ' ' + transcribedText);
      
      // Try to parse smart input for date/priority
      const parsed = await nlpService.parseSmartInput(transcribedText);
      if (parsed.dueDate) setDueDate(parsed.dueDate);
      if (parsed.priority !== Priority.None) setPriority(parsed.priority);
      if (parsed.tags.length > 0) setTags(prev => [...prev, ...parsed.tags]);
    } catch (error) {
      console.error('Transcription failed:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  // --- Image Upload & OCR ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const text = await aiService.extractImageText(file);
        setDescription(prev => prev + '\n' + text);
      } catch (error) {
        console.error('OCR failed:', error);
      }
    }
  };

  // --- Handle Tag Input ---
  const handleTagAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = tagInput.trim();
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
        setTagInput('');
      }
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // --- Submit ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please enter a task title');
      return;
    }

    // Combine due date and time
    let finalDueDate: Date | undefined;
    if (dueDate) {
      const [hours, minutes] = dueTime.split(':').map(Number);
      finalDueDate = new Date(dueDate);
      finalDueDate.setHours(hours, minutes, 0, 0);
    }

    const newTask: Task = {
      id: existingTask?.id || Date.now().toString(),
      title: title.trim(),
      description,
      isCompleted: existingTask?.isCompleted || false,
      priority,
      listId,
      tags,
      subtasks: [],
      attachments: [],
      isNote,
      color: isNote ? '#ffffff' : undefined,
      createdAt: existingTask?.createdAt || new Date(),
      updatedAt: new Date(),
      dueDate: finalDueDate
    };

    onAddTask(newTask);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority(Priority.None);
    setListId(initialConfig.listId || 'inbox');
    setTags([]);
    setTagInput('');
    setDueDate(null);
    setDueTime('09:00');
    setMode('text');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full md:w-[600px] bg-white dark:bg-slate-900 rounded-t-[32px] md:rounded-[32px] shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {existingTask ? 'Edit Task' : isNote ? 'New Note' : 'New Task'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        {/* Input Modes */}
        {!existingTask && (
          <div className="shrink-0 flex gap-2 p-4 overflow-x-auto border-b border-slate-100 dark:border-slate-800">
            {inputModes.map(m => (
              <button
                key={m.id}
                onClick={() => {
                  if (m.id === 'voice') startVoiceRecording();
                  setMode(m.id as any);
                }}
                className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                  mode === m.id
                    ? 'bg-blue-500 text-white shadow-lg' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Title Input */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              {isNote ? 'Note Title' : 'Task Title'} { isVoiceRecording && <Loader2 className="inline animate-spin ml-2" size={16} />}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={mode === 'voice' ? 'Listening...' : 'What needs to be done?'}
              disabled={isVoiceRecording}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50"
            />
          </div>

          {/* Description */}
          {!isNote && (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add details..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              />
            </div>
          )}

          {/* Image Input */}
          {mode === 'image' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 cursor-pointer hover:border-blue-500 transition-colors"
              />
            </div>
          )}

          {mode === 'drawing' && <DrawingCanvas />}

          {/* Tags */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tags</label>
            <div className="flex gap-2 flex-wrap mb-3">
              {tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium flex items-center gap-2">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900 dark:hover:text-blue-100">
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagAdd}
              placeholder="Type tag + Enter..."
              className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Due Date</label>
            {dueDate && (
              <div className="flex gap-3 items-end mb-3">
                <WheelPicker 
                  value={dueDate}
                  onChange={setDueDate}
                  type="date"
                />
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              {[
                { label: 'Today', days: 0 },
                { label: 'Tomorrow', days: 1 },
                { label: 'Next Week', days: 7 }
              ].map(btn => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => setDueDate(addDays(new Date(), btn.days))}
                  className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority & List */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as Priority)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={Priority.None}>None</option>
                <option value={Priority.Low}>Low</option>
                <option value={Priority.Medium}>Medium</option>
                <option value={Priority.High}>High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">List</label>
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="inbox">Inbox</option>
                {lists.map(list => (
                  <option key={list.id} value={list.id}>{list.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Voice Recording Status */}
          {isVoiceRecording && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-700 dark:text-red-300 font-medium">Recording... {recordingTime}s</span>
              </div>
              <button
                type="button"
                onClick={stopVoiceRecording}
                className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Stop
              </button>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="shrink-0 flex gap-3 p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Send size={18} />
            {existingTask ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
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
