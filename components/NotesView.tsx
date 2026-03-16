import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Plus, Search, Pin, PinOff, Trash2, Archive, ArchiveRestore,
  Tag, Palette, Lock, Unlock, Star, StarOff, Copy, Download,
  Bold, Italic, Underline, List, ListOrdered, AlignLeft,
  AlignCenter, AlignRight, Strikethrough, Code, Link,
  Image, ChevronDown, ChevronUp, Menu, X, Check,
  FileText, Grid, LayoutList, SortAsc, SortDesc, Filter,
  Clock, Edit3, Eye, ZoomIn, ZoomOut, MoreVertical,
  FolderPlus, Folder, Move, Share2, Mic, MicOff, Hash,
  RefreshCw, Type, Maximize2, Minimize2, AlertCircle
} from 'lucide-react';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────
export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  tags: string[];
  isPinned: boolean;
  isArchived: boolean;
  isLocked: boolean;
  isFavorite: boolean;
  folderId?: string;
  createdAt: Date;
  updatedAt: Date;
  wordCount: number;
  charCount: number;
  reminderDate?: Date;
  isDeleted?: boolean;
  coverImage?: string;
}

export interface NoteFolder {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: Date;
}

type SortBy = 'updatedAt' | 'createdAt' | 'title' | 'wordCount';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list' | 'compact';
type FilterMode = 'all' | 'pinned' | 'favorites' | 'archived' | 'locked' | 'tagged';

const NOTE_COLORS = [
  { label: 'Default',  value: 'bg-white dark:bg-slate-800',          border: 'border-slate-200 dark:border-slate-700' },
  { label: 'Rose',     value: 'bg-rose-50 dark:bg-rose-950',          border: 'border-rose-200 dark:border-rose-800' },
  { label: 'Indigo',   value: 'bg-indigo-50 dark:bg-indigo-950',      border: 'border-indigo-200 dark:border-indigo-800' },
  { label: 'Amber',    value: 'bg-amber-50 dark:bg-amber-950',        border: 'border-amber-200 dark:border-amber-800' },
  { label: 'Green',    value: 'bg-green-50 dark:bg-green-950',        border: 'border-green-200 dark:border-green-800' },
  { label: 'Teal',     value: 'bg-teal-50 dark:bg-teal-950',          border: 'border-teal-200 dark:border-teal-800' },
  { label: 'Blue',     value: 'bg-blue-50 dark:bg-blue-950',          border: 'border-blue-200 dark:border-blue-800' },
  { label: 'Violet',   value: 'bg-violet-50 dark:bg-violet-950',      border: 'border-violet-200 dark:border-violet-800' },
  { label: 'Pink',     value: 'bg-pink-50 dark:bg-pink-950',          border: 'border-pink-200 dark:border-pink-800' },
  { label: 'Slate',    value: 'bg-slate-100 dark:bg-slate-900',       border: 'border-slate-300 dark:border-slate-600' },
];

const FOLDER_ICONS = ['📁', '📂', '🗂️', '📚', '📝', '💡', '🎯', '🔖', '🗒️', '📌'];
const FOLDER_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f43f5e','#f59e0b','#10b981','#06b6d4','#3b82f6'];

const STORAGE_KEY = 'ticktickclone_notes_v2';
const FOLDERS_KEY = 'ticktickclone_notes_folders';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────
const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;
const countChars = (text: string) => text.replace(/\s/g, '').length;
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const loadNotes = (): Note[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((n: any) => ({
      ...n,
      createdAt: new Date(n.createdAt),
      updatedAt: new Date(n.updatedAt),
      reminderDate: n.reminderDate ? new Date(n.reminderDate) : undefined,
    }));
  } catch { return []; }
};

const saveNotes = (notes: Note[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
};

const loadFolders = (): NoteFolder[] => {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((f: any) => ({ ...f, createdAt: new Date(f.createdAt) }));
  } catch { return []; }
};

const saveFolders = (folders: NoteFolder[]) => {
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
};

const formatDate = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24)  return `${hrs}h ago`;
  if (days < 7)  return `${days}d ago`;
  return date.toLocaleDateString();
};

// ──────────────────────────────────────────────
// Rich Text Toolbar
// ──────────────────────────────────────────────
interface ToolbarProps {
  onFormat: (cmd: string, value?: string) => void;
  fontSize: number;
  setFontSize: (n: number) => void;
}

const RichToolbar: React.FC<ToolbarProps> = ({ onFormat, fontSize, setFontSize }) => {
  const btn = (icon: React.ReactNode, cmd: string, title: string, val?: string) => (
    <button
      key={cmd + (val ?? '')}
      onMouseDown={e => { e.preventDefault(); onFormat(cmd, val); }}
      title={title}
      className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors"
    >
      {icon}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
      {btn(<Bold size={14} />, 'bold', 'Bold')}
      {btn(<Italic size={14} />, 'italic', 'Italic')}
      {btn(<Underline size={14} />, 'underline', 'Underline')}
      {btn(<Strikethrough size={14} />, 'strikeThrough', 'Strikethrough')}
      <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />
      {btn(<AlignLeft size={14} />, 'justifyLeft', 'Align Left')}
      {btn(<AlignCenter size={14} />, 'justifyCenter', 'Align Center')}
      {btn(<AlignRight size={14} />, 'justifyRight', 'Align Right')}
      <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />
      {btn(<List size={14} />, 'insertUnorderedList', 'Bullet List')}
      {btn(<ListOrdered size={14} />, 'insertOrderedList', 'Numbered List')}
      {btn(<Code size={14} />, 'formatBlock', 'Code Block', 'pre')}
      <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-1" />
      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
        <button
          onMouseDown={e => { e.preventDefault(); setFontSize(Math.max(10, fontSize - 2)); }}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
        ><ZoomOut size={14} /></button>
        <span className="w-6 text-center font-mono text-xs">{fontSize}</span>
        <button
          onMouseDown={e => { e.preventDefault(); setFontSize(Math.min(32, fontSize + 2)); }}
          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
        ><ZoomIn size={14} /></button>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Note Editor Modal
// ──────────────────────────────────────────────
interface EditorProps {
  note: Note;
  folders: NoteFolder[];
  onSave: (note: Note) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

const NoteEditor: React.FC<EditorProps> = ({ note, folders, onSave, onClose, onDelete }) => {
  const [draft, setDraft] = useState<Note>({ ...note });
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [pinLock, setPinLock] = useState('');
  const [lockMode, setLockMode] = useState<'set' | 'verify' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState(15);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editorRef.current && draft.content !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = draft.content;
    }
  }, []);

  const handleContentChange = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const text = editorRef.current.innerText || '';
    const updated: Note = {
      ...draft,
      content: html,
      wordCount: countWords(text),
      charCount: countChars(text),
      updatedAt: new Date(),
    };
    setDraft(updated);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => onSave(updated), 800);
  };

  const handleFormat = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    handleContentChange();
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (t && !draft.tags.includes(t)) {
      const updated = { ...draft, tags: [...draft.tags, t], updatedAt: new Date() };
      setDraft(updated);
      onSave(updated);
    }
    setTagInput('');
    setShowTagInput(false);
  };

  const removeTag = (tag: string) => {
    const updated = { ...draft, tags: draft.tags.filter(t => t !== tag), updatedAt: new Date() };
    setDraft(updated);
    onSave(updated);
  };

  const toggleProp = (prop: keyof Note) => {
    const updated = { ...draft, [prop]: !draft[prop as keyof Note], updatedAt: new Date() };
    setDraft(updated as Note);
    onSave(updated as Note);
  };

  const setColor = (color: string) => {
    const updated = { ...draft, color, updatedAt: new Date() };
    setDraft(updated);
    onSave(updated);
    setShowColorPicker(false);
  };

  const setFolder = (folderId: string | undefined) => {
    const updated = { ...draft, folderId, updatedAt: new Date() };
    setDraft(updated);
    onSave(updated);
    setShowFolderPicker(false);
  };

  const exportNote = () => {
    const text = `${draft.title}\n${'='.repeat(draft.title.length || 10)}\n\n${editorRef.current?.innerText || ''}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.title || 'note'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyNote = async () => {
    const text = `${draft.title}\n\n${editorRef.current?.innerText || ''}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const speakNote = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(`${draft.title}. ${editorRef.current?.innerText || ''}`);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const currentColor = NOTE_COLORS.find(c => c.value === draft.color) || NOTE_COLORS[0];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 ${isFullscreen ? 'p-0' : ''}`}>
      <div className={`flex flex-col ${currentColor.value} border ${currentColor.border} rounded-2xl shadow-2xl overflow-hidden transition-all ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-3xl max-h-[90vh]'}`}>

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <input
            value={draft.title}
            onChange={e => {
              const updated = { ...draft, title: e.target.value, updatedAt: new Date() };
              setDraft(updated);
              onSave(updated);
            }}
            placeholder="Note title..."
            className="flex-1 text-lg font-semibold bg-transparent outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400"
          />
          <div className="flex items-center gap-1">
            {/* Favorite */}
            <button onClick={() => toggleProp('isFavorite')} title="Favorite"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              {draft.isFavorite
                ? <Star size={16} className="text-yellow-500 fill-yellow-500" />
                : <Star size={16} className="text-slate-400" />}
            </button>
            {/* Pin */}
            <button onClick={() => toggleProp('isPinned')} title="Pin"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              {draft.isPinned
                ? <Pin size={16} className="text-indigo-500" />
                : <PinOff size={16} className="text-slate-400" />}
            </button>
            {/* Color */}
            <div className="relative">
              <button onClick={() => setShowColorPicker(p => !p)} title="Color"
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                <Palette size={16} className="text-slate-400" />
              </button>
              {showColorPicker && (
                <div className="absolute right-0 top-9 z-50 flex flex-wrap gap-2 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-52">
                  {NOTE_COLORS.map(c => (
                    <button key={c.value} onClick={() => setColor(c.value)} title={c.label}
                      className={`w-7 h-7 rounded-full border-2 ${c.value} ${draft.color === c.value ? 'border-indigo-500 scale-110' : c.border} transition-transform hover:scale-110`} />
                  ))}
                </div>
              )}
            </div>
            {/* Tags */}
            <button onClick={() => setShowTagInput(p => !p)} title="Tags"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              <Tag size={16} className="text-slate-400" />
            </button>
            {/* Folder */}
            <div className="relative">
              <button onClick={() => setShowFolderPicker(p => !p)} title="Move to Folder"
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                <Folder size={16} className="text-slate-400" />
              </button>
              {showFolderPicker && (
                <div className="absolute right-0 top-9 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden w-44">
                  <button onClick={() => setFolder(undefined)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm text-slate-600 dark:text-slate-300">
                    📁 No Folder
                  </button>
                  {folders.map(f => (
                    <button key={f.id} onClick={() => setFolder(f.id)}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm text-slate-600 dark:text-slate-300 ${draft.folderId === f.id ? 'bg-indigo-50 dark:bg-indigo-950' : ''}`}>
                      {f.icon} {f.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Copy */}
            <button onClick={copyNote} title="Copy note"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-slate-400" />}
            </button>
            {/* Export */}
            <button onClick={exportNote} title="Export as .txt"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              <Download size={16} className="text-slate-400" />
            </button>
            {/* TTS */}
            <button onClick={speakNote} title="Read aloud"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              {isSpeaking ? <MicOff size={16} className="text-red-500" /> : <Mic size={16} className="text-slate-400" />}
            </button>
            {/* Lock */}
            <button onClick={() => toggleProp('isLocked')} title="Lock"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              {draft.isLocked ? <Lock size={16} className="text-indigo-500" /> : <Unlock size={16} className="text-slate-400" />}
            </button>
            {/* Archive */}
            <button onClick={() => { toggleProp('isArchived'); onClose(); }} title="Archive"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              {draft.isArchived ? <ArchiveRestore size={16} className="text-slate-400" /> : <Archive size={16} className="text-slate-400" />}
            </button>
            {/* Delete */}
            <button onClick={() => { onDelete(draft.id); onClose(); }} title="Delete"
              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
              <Trash2 size={16} className="text-red-400" />
            </button>
            {/* Fullscreen */}
            <button onClick={() => setIsFullscreen(p => !p)} title="Fullscreen"
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              {isFullscreen ? <Minimize2 size={16} className="text-slate-400" /> : <Maximize2 size={16} className="text-slate-400" />}
            </button>
            {/* Close */}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Tag input */}
        {showTagInput && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40">
            <Hash size={14} className="text-slate-400" />
            <input
              autoFocus
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTag(); if (e.key === 'Escape') setShowTagInput(false); }}
              placeholder="Add tag and press Enter…"
              className="flex-1 bg-transparent outline-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400"
            />
            <button onClick={addTag} className="text-xs text-indigo-500 font-medium">Add</button>
          </div>
        )}

        {/* Tags display */}
        {draft.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
            {draft.tags.map(tag => (
              <span key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-medium">
                #{tag}
                <button onClick={() => removeTag(tag)} className="hover:text-red-500">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Rich text toolbar */}
        <RichToolbar onFormat={handleFormat} fontSize={fontSize} setFontSize={setFontSize} />

        {/* Editor */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleContentChange}
          style={{ fontSize: `${fontSize}px`, minHeight: '200px' }}
          className="flex-1 px-5 py-4 outline-none overflow-y-auto text-slate-800 dark:text-slate-100 leading-relaxed"
          data-placeholder="Start writing your note..."
        />

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 text-xs text-slate-400">
          <span className="flex items-center gap-3">
            <span>{draft.wordCount} words</span>
            <span>{draft.charCount} chars</span>
            {draft.folderId && (
              <span className="flex items-center gap-1">
                <Folder size={11} />
                {folders.find(f => f.id === draft.folderId)?.name}
              </span>
            )}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatDate(draft.updatedAt)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Note Card
// ──────────────────────────────────────────────
interface CardProps {
  note: Note;
  viewMode: ViewMode;
  onClick: () => void;
  onPin: () => void;
  onFavorite: () => void;
  onLock: () => void;
  onDelete: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
}

const NoteCard: React.FC<CardProps> = ({ note, viewMode, onClick, onPin, onFavorite, onLock, onDelete, onArchive, onDuplicate }) => {
  const [showMenu, setShowMenu] = useState(false);
  const colorObj = NOTE_COLORS.find(c => c.value === note.color) || NOTE_COLORS[0];

  const preview = note.content
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, viewMode === 'compact' ? 80 : 200);

  if (viewMode === 'list') {
    return (
      <div
        className={`group flex items-start gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all hover:shadow-md ${colorObj.value} ${colorObj.border}`}
        onClick={onClick}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            {note.isPinned && <Pin size={11} className="text-indigo-400 shrink-0" />}
            {note.isFavorite && <Star size={11} className="text-yellow-400 fill-yellow-400 shrink-0" />}
            {note.isLocked && <Lock size={11} className="text-slate-400 shrink-0" />}
            <span className="font-medium text-sm text-slate-800 dark:text-slate-100 truncate">
              {note.title || 'Untitled'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{preview}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-slate-400">
          {note.tags.slice(0, 2).map(t => (
            <span key={t} className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">#{t}</span>
          ))}
          <span>{formatDate(note.updatedAt)}</span>
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setShowMenu(p => !p); }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
            ><MoreVertical size={13} /></button>
            {showMenu && (
              <ContextMenu
                onPin={() => { onPin(); setShowMenu(false); }}
                onFavorite={() => { onFavorite(); setShowMenu(false); }}
                onLock={() => { onLock(); setShowMenu(false); }}
                onArchive={() => { onArchive(); setShowMenu(false); }}
                onDuplicate={() => { onDuplicate(); setShowMenu(false); }}
                onDelete={() => { onDelete(); setShowMenu(false); }}
                onClose={() => setShowMenu(false)}
                note={note}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5 overflow-hidden ${colorObj.value} ${colorObj.border} ${viewMode === 'compact' ? 'min-h-[80px]' : 'min-h-[140px]'}`}
      onClick={onClick}
    >
      {/* Indicators */}
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
        {note.isPinned && (
          <span className="p-1 rounded-full bg-indigo-100 dark:bg-indigo-900/50">
            <Pin size={10} className="text-indigo-500" />
          </span>
        )}
        {note.isFavorite && (
          <span className="p-1 rounded-full bg-yellow-100 dark:bg-yellow-900/50">
            <Star size={10} className="text-yellow-500 fill-yellow-500" />
          </span>
        )}
        {note.isLocked && (
          <span className="p-1 rounded-full bg-slate-100 dark:bg-slate-700">
            <Lock size={10} className="text-slate-500" />
          </span>
        )}
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setShowMenu(p => !p); }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-full bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-700 shadow transition-all"
          ><MoreVertical size={12} /></button>
          {showMenu && (
            <ContextMenu
              onPin={() => { onPin(); setShowMenu(false); }}
              onFavorite={() => { onFavorite(); setShowMenu(false); }}
              onLock={() => { onLock(); setShowMenu(false); }}
              onArchive={() => { onArchive(); setShowMenu(false); }}
              onDuplicate={() => { onDuplicate(); setShowMenu(false); }}
              onDelete={() => { onDelete(); setShowMenu(false); }}
              onClose={() => setShowMenu(false)}
              note={note}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-3.5 pt-3 flex-1">
        {note.title && (
          <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 pr-16 leading-snug line-clamp-2">
            {note.title}
          </h3>
        )}
        {!note.isLocked && (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3 flex-1">
            {preview || <span className="italic">Empty note</span>}
          </p>
        )}
        {note.isLocked && (
          <p className="text-xs text-slate-400 italic flex items-center gap-1">
            <Lock size={10} /> Content is locked
          </p>
        )}
        {note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {note.tags.slice(0, 3).map(t => (
              <span key={t} className="px-1.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-500 dark:text-slate-400 text-[10px]">
                #{t}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-[10px] text-slate-400">+{note.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
      <div className="px-3.5 py-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[10px] text-slate-400">
        <span>{note.wordCount > 0 ? `${note.wordCount}w` : 'empty'}</span>
        <span>{formatDate(note.updatedAt)}</span>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Context Menu
// ──────────────────────────────────────────────
interface CtxMenuProps {
  note: Note;
  onPin: () => void;
  onFavorite: () => void;
  onLock: () => void;
  onArchive: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

const ContextMenu: React.FC<CtxMenuProps> = ({ note, onPin, onFavorite, onLock, onArchive, onDuplicate, onDelete, onClose }) => {
  useEffect(() => {
    const handler = () => onClose();
    setTimeout(() => window.addEventListener('click', handler), 0);
    return () => window.removeEventListener('click', handler);
  }, [onClose]);

  const item = (icon: React.ReactNode, label: string, action: () => void, danger = false) => (
    <button
      onClick={e => { e.stopPropagation(); action(); }}
      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-left ${danger ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30' : 'text-slate-700 dark:text-slate-300'}`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div
      className="absolute right-0 top-7 z-50 w-44 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {item(note.isPinned ? <PinOff size={14} /> : <Pin size={14} />, note.isPinned ? 'Unpin' : 'Pin', onPin)}
      {item(note.isFavorite ? <StarOff size={14} /> : <Star size={14} />, note.isFavorite ? 'Unfavorite' : 'Favorite', onFavorite)}
      {item(note.isLocked ? <Unlock size={14} /> : <Lock size={14} />, note.isLocked ? 'Unlock' : 'Lock', onLock)}
      {item(<Copy size={14} />, 'Duplicate', onDuplicate)}
      {item(note.isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />, note.isArchived ? 'Unarchive' : 'Archive', onArchive)}
      <div className="border-t border-slate-100 dark:border-slate-700" />
      {item(<Trash2 size={14} />, 'Delete', onDelete, true)}
    </div>
  );
};

// ──────────────────────────────────────────────
// Folder Manager
// ──────────────────────────────────────────────
interface FolderManagerProps {
  folders: NoteFolder[];
  onAddFolder: (f: NoteFolder) => void;
  onDeleteFolder: (id: string) => void;
  onClose: () => void;
}

const FolderManager: React.FC<FolderManagerProps> = ({ folders, onAddFolder, onDeleteFolder, onClose }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState(FOLDER_COLORS[0]);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAddFolder({ id: newId(), name: name.trim(), color, icon, createdAt: new Date() });
    setName('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">Manage Folders</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-4 space-y-4">
          {/* New folder */}
          <div className="flex gap-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Folder name..."
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-transparent text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleAdd}
              className="px-3 py-2 rounded-lg bg-indigo-500 hover:bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm font-medium transition-colors"
            >Add</button>
          </div>
          {/* Icon picker */}
          <div className="flex flex-wrap gap-2">
            {FOLDER_ICONS.map(i => (
              <button
                key={i}
                onClick={() => setIcon(i)}
                className={`w-8 h-8 rounded-lg text-base transition-all ${icon === i ? 'bg-indigo-100 dark:bg-indigo-900 scale-110' : 'hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >{i}</button>
            ))}
          </div>
          {/* Color picker */}
          <div className="flex flex-wrap gap-2">
            {FOLDER_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{ background: c }}
                className={`w-6 h-6 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500' : 'hover:scale-110'}`}
              />
            ))}
          </div>
          {/* Existing folders */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {folders.length === 0 && <p className="text-sm text-slate-400 text-center py-2">No folders yet</p>}
            {folders.map(f => (
              <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                <span style={{ color: f.color }}>{f.icon}</span>
                <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{f.name}</span>
                <button onClick={() => onDeleteFolder(f.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────
// Main NotesView
// ──────────────────────────────────────────────
interface NotesViewProps {
  onMenuClick?: () => void;
}

const NotesView: React.FC<NotesViewProps> = ({ onMenuClick }) => {
  const [notes, setNotes] = useState<Note[]>(loadNotes);
  const [folders, setFolders] = useState<NoteFolder[]>(loadFolders);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFolderManager, setShowFolderManager] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Persist
  useEffect(() => { saveNotes(notes); }, [notes]);
  useEffect(() => { saveFolders(folders); }, [folders]);

  const allTags = Array.from(new Set(notes.flatMap(n => n.tags)));

  const createNote = () => {
    const note: Note = {
      id: newId(),
      title: '',
      content: '',
      color: NOTE_COLORS[0].value,
      tags: selectedTags.length > 0 ? [...selectedTags] : [],
      isPinned: false,
      isArchived: false,
      isLocked: false,
      isFavorite: false,
      folderId: selectedFolder ?? undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      wordCount: 0,
      charCount: 0,
    };
    setNotes(prev => [note, ...prev]);
    setSelectedNote(note);
  };

  const updateNote = useCallback((updated: Note) => {
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
  }, []);

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    if (selectedNote?.id === id) setSelectedNote(null);
  };

  const duplicateNote = (note: Note) => {
    const dup: Note = { ...note, id: newId(), title: `${note.title} (Copy)`, createdAt: new Date(), updatedAt: new Date() };
    setNotes(prev => [dup, ...prev]);
  };

  const toggleProp = (id: string, prop: keyof Note) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, [prop]: !n[prop as keyof Note], updatedAt: new Date() } : n));
  };

  const addFolder = (f: NoteFolder) => setFolders(prev => [...prev, f]);
  const deleteFolder = (id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    setNotes(prev => prev.map(n => n.folderId === id ? { ...n, folderId: undefined } : n));
    if (selectedFolder === id) setSelectedFolder(null);
  };

  // Filter + sort
  const filtered = notes
    .filter(n => !n.isDeleted)
    .filter(n => {
      if (filterMode === 'pinned')    return n.isPinned && !n.isArchived;
      if (filterMode === 'favorites') return n.isFavorite && !n.isArchived;
      if (filterMode === 'archived')  return n.isArchived;
      if (filterMode === 'locked')    return n.isLocked && !n.isArchived;
      if (filterMode === 'tagged')    return n.tags.length > 0 && !n.isArchived;
      return !n.isArchived;
    })
    .filter(n => selectedFolder ? n.folderId === selectedFolder : true)
    .filter(n => selectedTags.length === 0 || selectedTags.every(t => n.tags.includes(t)))
    .filter(n => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const text = n.content.replace(/<[^>]+>/g, ' ').toLowerCase();
      return n.title.toLowerCase().includes(q) || text.includes(q) || n.tags.some(t => t.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'updatedAt') cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      else if (sortBy === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortBy === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortBy === 'wordCount') cmp = a.wordCount - b.wordCount;
      if (sortOrder === 'desc') cmp = -cmp;
      // Pinned first in 'all' view
      if (filterMode === 'all') {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
      }
      return cmp;
    });

  const pinnedNotes  = filtered.filter(n => n.isPinned);
  const regularNotes = filtered.filter(n => !n.isPinned);

  const stats = {
    total:     notes.filter(n => !n.isDeleted && !n.isArchived).length,
    pinned:    notes.filter(n => n.isPinned && !n.isDeleted && !n.isArchived).length,
    favorites: notes.filter(n => n.isFavorite && !n.isDeleted && !n.isArchived).length,
    archived:  notes.filter(n => n.isArchived && !n.isDeleted).length,
    words:     notes.filter(n => !n.isDeleted && !n.isArchived).reduce((s, n) => s + n.wordCount, 0),
  };

  const gridClass = viewMode === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3'
    : viewMode === 'compact'
    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2'
    : 'flex flex-col gap-2';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden">
      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
        <button onClick={onMenuClick} className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
          <Menu size={18} className="text-slate-500" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <FileText size={18} className="text-indigo-500 shrink-0" />
          <h1 className="font-bold text-slate-800 dark:text-slate-100 text-base hidden sm:block">Notes</h1>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs">{stats.total}</span>
        </div>
        {/* Search */}
        <div className="flex items-center gap-2 flex-1 max-w-xs bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-1.5">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search notes…"
            className="bg-transparent outline-none text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 w-full"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}><X size={12} className="text-slate-400 hover:text-slate-600" /></button>
          )}
        </div>
        {/* Sort */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(p => !p)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700"
          >
            {sortOrder === 'desc' ? <SortDesc size={13} /> : <SortAsc size={13} />}
            <span className="hidden sm:inline capitalize">{sortBy === 'updatedAt' ? 'Modified' : sortBy === 'createdAt' ? 'Created' : sortBy === 'wordCount' ? 'Length' : 'Title'}</span>
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-9 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-36 overflow-hidden">
              {(['updatedAt','createdAt','title','wordCount'] as SortBy[]).map(s => (
                <button
                  key={s}
                  onClick={() => { setSortBy(s); setShowSortMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 ${sortBy === s ? 'text-indigo-500 font-medium' : 'text-slate-600 dark:text-slate-300'}`}
                >
                  {s === 'updatedAt' ? 'Modified' : s === 'createdAt' ? 'Created' : s === 'wordCount' ? 'Length' : 'Title'}
                </button>
              ))}
              <div className="border-t border-slate-100 dark:border-slate-700" />
              <button
                onClick={() => { setSortOrder(p => p === 'asc' ? 'desc' : 'asc'); setShowSortMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
              >
                {sortOrder === 'desc' ? <><SortAsc size={13}/> Ascending</> : <><SortDesc size={13}/> Descending</>}
              </button>
            </div>
          )}
        </div>
        {/* View toggle */}
        <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {(['grid','list','compact'] as ViewMode[]).map(m => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`p-1.5 transition-colors ${viewMode === m ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title={m.charAt(0).toUpperCase() + m.slice(1)}
            >
              {m === 'grid' ? <Grid size={14}/> : m === 'list' ? <LayoutList size={14}/> : <Type size={14}/>}
            </button>
          ))}
        </div>
        {/* New note */}
        <button
          onClick={createNote}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm font-medium transition-colors shadow-sm"
        >
          <Plus size={15} />
          <span className="hidden sm:inline">New</span>
        </button>
      </div>

      {/* ── FILTER PILLS ── */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-none border-b border-slate-100 dark:border-slate-800 shrink-0">
        {([
          { id: 'all', label: `All (${stats.total})` },
          { id: 'pinned', label: `📌 Pinned (${stats.pinned})` },
          { id: 'favorites', label: `⭐ Favorites (${stats.favorites})` },
          { id: 'archived', label: `📦 Archived (${stats.archived})` },
          { id: 'locked', label: '🔒 Locked' },
          { id: 'tagged', label: '🏷️ Tagged' },
        ] as { id: FilterMode; label: string }[]).map(f => (
          <button
            key={f.id}
            onClick={() => setFilterMode(f.id)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${filterMode === f.id ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >{f.label}</button>
        ))}
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 shrink-0 mx-1" />
        {/* Folders */}
        {folders.map(f => (
          <button
            key={f.id}
            onClick={() => setSelectedFolder(p => p === f.id ? null : f.id)}
            className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium transition-all ${selectedFolder === f.id ? 'text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            style={selectedFolder === f.id ? { background: f.color } : {}}
          >
            {f.icon} {f.name}
          </button>
        ))}
        <button
          onClick={() => setShowFolderManager(true)}
          className="shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-dashed border-slate-300 dark:border-slate-600 transition-all"
        >
          <FolderPlus size={11} /> Folders
        </button>
      </div>

      {/* ── TAG FILTER ── */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto scrollbar-none border-b border-slate-100 dark:border-slate-800 shrink-0">
          <Hash size={12} className="text-slate-400 shrink-0" />
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
              className={`shrink-0 px-2 py-0.5 rounded-full text-xs transition-all ${selectedTags.includes(tag) ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >#{tag}</button>
          ))}
          {selectedTags.length > 0 && (
            <button onClick={() => setSelectedTags([])} className="text-xs text-red-400 hover:text-red-600">Clear</button>
          )}
        </div>
      )}

      {/* ── STATS BAR ── */}
      <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 shrink-0">
        <span>{filtered.length} note{filtered.length !== 1 ? 's' : ''}</span>
        <span>{stats.words.toLocaleString()} total words</span>
        {searchQuery && <span className="text-indigo-500">Searching: "{searchQuery}"</span>}
        {selectedFolder && <span className="text-indigo-500">📁 {folders.find(f => f.id === selectedFolder)?.name}</span>}
        {selectedTags.length > 0 && <span className="text-indigo-500">Tags: {selectedTags.map(t => `#${t}`).join(', ')}</span>}
      </div>

      {/* ── NOTES GRID / LIST ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
            <FileText size={40} className="opacity-20" />
            <p className="text-sm font-medium">
              {searchQuery ? `No results for "${searchQuery}"` : filterMode === 'archived' ? 'No archived notes' : 'No notes yet'}
            </p>
            {!searchQuery && filterMode === 'all' && (
              <button
                onClick={createNote}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm font-medium transition-colors"
              >
                <Plus size={15}/> Create your first note
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Pinned section */}
            {filterMode === 'all' && pinnedNotes.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-2.5">
                  <Pin size={12} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pinned</span>
                </div>
                <div className={gridClass}>
                  {pinnedNotes.map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      viewMode={viewMode}
                      onClick={() => setSelectedNote(note)}
                      onPin={() => toggleProp(note.id, 'isPinned')}
                      onFavorite={() => toggleProp(note.id, 'isFavorite')}
                      onLock={() => toggleProp(note.id, 'isLocked')}
                      onDelete={() => deleteNote(note.id)}
                      onArchive={() => toggleProp(note.id, 'isArchived')}
                      onDuplicate={() => duplicateNote(note)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Regular notes */}
            {(filterMode !== 'all' || regularNotes.length > 0) && (
              <div>
                {filterMode === 'all' && pinnedNotes.length > 0 && regularNotes.length > 0 && (
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Others</span>
                  </div>
                )}
                <div className={gridClass}>
                  {(filterMode === 'all' ? regularNotes : filtered).map(note => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      viewMode={viewMode}
                      onClick={() => setSelectedNote(note)}
                      onPin={() => toggleProp(note.id, 'isPinned')}
                      onFavorite={() => toggleProp(note.id, 'isFavorite')}
                      onLock={() => toggleProp(note.id, 'isLocked')}
                      onDelete={() => deleteNote(note.id)}
                      onArchive={() => toggleProp(note.id, 'isArchived')}
                      onDuplicate={() => duplicateNote(note)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── NOTE EDITOR MODAL ── */}
      {selectedNote && (
        <NoteEditor
          note={selectedNote}
          folders={folders}
          onSave={updated => {
            updateNote(updated);
            setSelectedNote(updated);
          }}
          onClose={() => setSelectedNote(null)}
          onDelete={deleteNote}
        />
      )}

      {/* ── FOLDER MANAGER ── */}
      {showFolderManager && (
        <FolderManager
          folders={folders}
          onAddFolder={addFolder}
          onDeleteFolder={deleteFolder}
          onClose={() => setShowFolderManager(false)}
        />
      )}
    </div>
  );
};

export default NotesView;
