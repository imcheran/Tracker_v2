
export enum Priority {
  None = 0,
  Low = 1,
  Medium = 2,
  High = 3
}

export enum ViewType {
  Inbox = 'inbox',
  Today = 'today',
  Next7Days = 'next7days',
  Calendar = 'calendar',
  Focus = 'focus',
  Habits = 'habits',
  HabitStats = 'habitStats',
  Tags = 'tags',
  Completed = 'completed',
  Trash = 'trash',
  Search = 'search',
  Notes = 'notes',
  All = 'all',
  Archive = 'archive',
  Finance = 'finance',
  Matrix = 'matrix',
  Kanban = 'kanban',
  BudgetPlanner = 'budgetplanner',
  NetWorth = 'networth',
  WeeklyReview = 'weeklyreview',
  FocusHeatmap = 'focusheatmap',
  TagAnalytics = 'taganalytics',
  ProductivityScore = 'productivityscore'
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate?: Date;
  isAllDay?: boolean;
  priority?: Priority;
  tags?: string[];
}

export interface TaskLocation {
  name: string;
  lat?: number;
  lng?: number;
}

export interface Task {
  id: string;
  parentId?: string; // New: Links this task to a parent task
  title: string;
  description?: string;
  isCompleted: boolean;
  priority: Priority;
  listId: string;
  tags: string[];
  dueDate?: Date;
  endDate?: Date;
  duration?: number; // in minutes
  isAllDay?: boolean;
  subtasks: Subtask[];
  attachments: { id: string; title: string; type: 'image' | 'file' | 'voice' | 'drawing'; url: string; text?: string }[];
  isNote?: boolean;
  isEvent?: boolean; 
  isDeleted?: boolean;
  isArchived?: boolean; 
  isLocked?: boolean; 
  reminder?: Date;
  externalId?: string; 
  createdAt?: Date;
  updatedAt?: Date; 
  isPinned?: boolean;
  isWontDo?: boolean;
  repeat?: string;
  location?: TaskLocation;
  color?: string; 
  backgroundImage?: string; // New: Support for "Happy Trees" / Image backgrounds
  isFormattingActive?: boolean; // New: Rich text state
  collaborators?: string[]; 
  linkedTasks?: string[]; 
}

export interface List {
  id: string;
  name: string;
  color: string;
  updatedAt?: Date;
}

// ── Budget ────────────────────────────────────────────────────────
export interface BudgetCategory {
  id: string;
  category: string; // matches Transaction.category
  monthlyLimit: number;
  color: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Recurring Transaction Template ───────────────────────────────
export interface RecurringTransaction {
  id: string;
  title: string;       // e.g. "Rent"
  amount: number;
  type: 'debit' | 'credit';
  category: string;
  merchant: string;
  paymentmethod: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDate: string;    // YYYY-MM-DD
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Habit Routine (Habit Stacking) ───────────────────────────────
export interface HabitRoutine {
  id: string;
  name: string;            // e.g. "Morning Routine"
  section: 'Morning' | 'Evening' | 'Custom';
  habitIds: string[];      // ordered list
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Mood Log (surface the existing mood field) ───────────────────
export interface MoodEntry {
  date: string;            // YYYY-MM-DD
  mood: 'great' | 'good' | 'okay' | 'bad' | 'awful';
  note?: string;
}

// ── Task Template ─────────────────────────────────────────────────
export interface TaskTemplate {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  tags: string[];
  subtasks: Subtask[];
  listId: string;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  description?: string;
  quote?: string;
  goal?: number;
  frequencyType?: 'daily' | 'weekly' | 'monthly' | 'interval' | 'specific_days';
  frequencyDays?: number[]; // 0-6
  frequencyCount?: number;
  section?: 'Morning' | 'Afternoon' | 'Night' | 'Others';
  routine?: string; // New: Smart Routine Grouping
  isNegative?: boolean; // New: Tracking habits to break
  streakFreezes?: number; // New: Available streak freezes
  freezeDates?: string[]; // New: Dates where freeze was used
  startDate?: Date;
  endDate?: Date;
  reminders?: string[];
  targetValue?: number;
  unit?: string;
  isArchived?: boolean;
  isAutoLog?: boolean;
  createdDate?: Date;
  updatedAt?: Date;
  history: Record<string, { completed: boolean; timestamp: number; mood?: string; note?: string; skipReason?: string; duration?: number }>;
}

export type HabitLog = Habit['history'][string];
export type HabitSection = NonNullable<Habit['section']>;
export type HabitFrequencyType = NonNullable<Habit['frequencyType']>;

export type TimerMode = 'pomo' | 'stopwatch';

export interface FocusCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  mode: TimerMode;
  defaultDuration: number;
  updatedAt?: Date;
}

export interface FocusSession {
  id: string;
  duration: number; // minutes
  timestamp: Date;
  taskId?: string;
  taskTitle?: string;
  categoryId?: string;
  status?: 'completed' | 'failed' | 'interrupted';
  treeId?: string;
  coinsEarned?: number;
}

export interface Transaction {
  id: string; 
  is_transaction: boolean;
  amount: number;
  type: 'debit' | 'credit';
  merchant: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  payment_method: string;
  bank?: string;
  category: string;
  transaction_type?: string;
  exclude_from_budget?: boolean;
  account_balance?: number;
  upi_ref?: string;
  sender_upi_id?: string;
  account_last_4?: string;
  notes?: string;
  raw_sms: string;
  createdAt: Date;
  updatedAt?: Date; // Added for sync
  
  // Couples Finance Features
  isShared?: boolean; 
  paidBy?: string; // UID of the user who paid

  // Split Expense Feature
  personalShare?: number; // The amount that actually counts as expense, if different from total amount
}

export interface Debtor {
  id: string;
  name: string;
  type: string; // 'Person', 'Credit Card', 'Loan', etc.
  icon?: string;
  color?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Debt {
  id: string;
  debtorId: string;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  type: 'Borrow' | 'Lend';
  createdAt: Date;
  updatedAt?: Date;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  color: string;
  icon: string;
  deadline?: string; // YYYY-MM-DD
  createdAt: Date;
  updatedAt?: Date; // Added for sync
}

export interface Subscription {
  id: string;
  name: string;
  price: number;
  period: 'Monthly' | 'Yearly';
  startDate: string; // YYYY-MM-DD
  url?: string; // For favicon
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Investment {
  id: string;
  name: string;
  units: number;
  avgPrice: number; // Buying price per unit
  currentPrice?: number; // Current market price per unit (optional/manual)
  type: 'Stock' | 'Crypto' | 'Mutual Fund' | 'Gold' | 'Real Estate' | 'Other';
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface AppSettings {
  security?: {
      pin?: string;
  };
  features?: {
      tasks?: boolean;
      calendar?: boolean;
      habits?: boolean;
      focus?: boolean;
      notes?: boolean;
      finance?: boolean;
      matrix?: boolean;
      kanban?: boolean;
  };
  stats?: {
      karmaScore?: number;
      totalFocusMinutes?: number;
      level?: number;
      completedTaskCount?: number;
  };
  focus?: {
      unlockedTrees?: string[];
      totalCoins?: number; // Cache calculated coins if needed, but we can compute from sessions + unlocks
  };
  couples?: {
      partnerId?: string; // UID of the linked partner
      partnerName?: string;
      householdId?: string;
  }
}
