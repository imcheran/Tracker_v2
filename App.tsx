
import React, { useState, useEffect, useRef, Suspense, lazy, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import TaskView from './components/TaskView';
import TaskDetailView from './components/TaskDetailView';
// Lazy load heavy components to improve startup speed
const HabitsModule = lazy(() => import('./components/HabitsModule'));
const FocusView = lazy(() => import('./components/FocusView'));
const CalendarView = lazy(() => import('./components/CalendarView'));
const TagsView = lazy(() => import('./components/TagsView'));
const FinanceView = lazy(() => import('./components/FinanceView'));
const NotesView = lazy(() => import('./components/NotesView'));
const SettingsView = lazy(() => import('./components/SettingsView'));
const ProfileMenu = lazy(() => import('./components/ProfileMenu'));
const CouplesView = lazy(() => import('./components/CouplesView'));

import { MobileNavigation } from './components/MobileNavigation';
import { Task, ViewType, Habit, FocusCategory, List, AppSettings, FocusSession, Transaction, Debt, Debtor, SavingsGoal, Subscription, Investment, CouplesData, CoupleProfile } from './types';
import { loadFromStorage, saveToStorage, STORAGE_KEYS } from './services/storageService';
import { loginWithGoogle, logoutUser, subscribeToAuthChanges, saveUserDataToFirestore, subscribeToDataChanges, loadUserDataFromFirestore, linkPartnerByCode, generateInviteCode, subscribeToCoupleData } from './services/firebaseService';
import { createNotificationRoleContext, initializeRoleServices } from './services/notificationRoleService';
import { fetchCalendarEvents, updateCalendarEvent, deleteCalendarEvent, createCalendarEvent } from './services/googleCalendarService';
import { playAlarmSound } from './services/notificationService';
import { Loader2 } from 'lucide-react';
import { addMonths } from 'date-fns';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

// Smart Merge Function
const mergeArrays = <T extends { id: string; updatedAt?: Date | string }>(local: T[], remote: T[]): T[] => {
    const map = new Map<string, T>();
    local.forEach(item => map.set(item.id, item));
    
    remote.forEach(item => {
        const localItem = map.get(item.id);
        const remoteItem = { ...item }; 
        
        if (!localItem) {
            map.set(remoteItem.id, remoteItem);
        } else {
            const localTime = new Date(localItem.updatedAt || 0).getTime();
            const remoteTime = new Date(remoteItem.updatedAt || 0).getTime();
            
            if (remoteTime > localTime) {
                map.set(remoteItem.id, remoteItem);
            }
        }
    });
    return Array.from(map.values());
};

const LoadingFallback: React.FC = () => (
  <div className="flex-1 flex flex-col items-center justify-center h-full gap-3
    bg-white dark:bg-[#0f0f1a] rounded-[28px]">
    <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500
      animate-spin" />
    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium animate-pulse">
      Loading…
    </p>
  </div>
);

const App: React.FC = () => {
  // --- Main App State ---
  const [currentView, setCurrentView] = useState<ViewType | string>(ViewType.Inbox);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [focusTaskId, setFocusTaskId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // --- Theme State ---
  const [theme, setTheme] = useState<'light' | 'dark'>(() => 
    loadFromStorage<'light' | 'dark'>('ticktick_clone_theme', 'light')
  );

  useEffect(() => {
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    saveToStorage('ticktick_clone_theme', theme);
  }, [theme]);
  
  // --- Loading State ---
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'saved' | 'saving' | 'error' | 'offline'>('saved');

  // --- Auth State ---
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    const token = localStorage.getItem('google_access_token');
    return token || loadFromStorage(STORAGE_KEYS.TOKEN, null);
  });
  
  // --- Data States ---
  const [settings, setSettings] = useState<AppSettings>(() => {
      const saved = loadFromStorage<AppSettings>(STORAGE_KEYS.SETTINGS, {});
      const defaultFeatures = {
          tasks: true, 
          calendar: true,
          habits: true,
          focus: true,
          notes: true,
          finance: true
      };
      const mergedFeatures = { ...defaultFeatures, ...(saved.features || {}) };
      return { ...saved, features: mergedFeatures };
  });

  const [lists, setLists] = useState<List[]>(() => {
      const loaded = loadFromStorage(STORAGE_KEYS.LISTS, []);
      return Array.isArray(loaded) ? loaded : [
        { id: 'work', name: 'Work', color: '#3b82f6', updatedAt: new Date() },
        { id: 'personal', name: 'Personal', color: '#10b981', updatedAt: new Date() }
      ];
  });

  const [tasks, setTasks] = useState<Task[]>(() => {
      const loaded = loadFromStorage(STORAGE_KEYS.TASKS, []);
      const raw = Array.isArray(loaded) ? loaded : [];
      return raw.map((t: any) => ({
          ...t,
          dueDate: t.dueDate && !isNaN(new Date(t.dueDate).getTime()) ? new Date(t.dueDate) : undefined,
          updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date(),
      }));
  });

  const [habits, setHabits] = useState<Habit[]>(() => loadFromStorage(STORAGE_KEYS.HABITS, []));
  const [focusCategories, setFocusCategories] = useState<FocusCategory[]>(() => loadFromStorage(STORAGE_KEYS.FOCUS, []));
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>(() => loadFromStorage(STORAGE_KEYS.FOCUS_SESSIONS, []));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadFromStorage(STORAGE_KEYS.TRANSACTIONS, []));
  const [debtors, setDebtors] = useState<Debtor[]>(() => loadFromStorage(STORAGE_KEYS.DEBTORS, []));
  const [debts, setDebts] = useState<Debt[]>(() => loadFromStorage(STORAGE_KEYS.DEBTS, []));
  const [goals, setGoals] = useState<SavingsGoal[]>(() => loadFromStorage(STORAGE_KEYS.GOALS, []));
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(() => loadFromStorage(STORAGE_KEYS.SUBSCRIPTIONS, []));
  const [investments, setInvestments] = useState<Investment[]>(() => loadFromStorage(STORAGE_KEYS.INVESTMENTS, []));

  // ── Couples Space ───────────────────────────────────────────────────────
  const [couplesData, setCouplesData] = useState<CouplesData>(() => {
    const saved = loadFromStorage<CouplesData | null>(STORAGE_KEYS.COUPLES_DATA, null);
    if (saved) return saved;
    return {
      myProfile: {
        uid: '',
        displayName: 'You',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: 'free',
      },
      photoWall: [],
      journal: [],
      checkIns: [],
      sharedChallenges: [],
    };
  });

  // --- Partner Data State ---
  const [partnerTransactions, setPartnerTransactions] = useState<Transaction[]>([]);
  const [partnerGoals, setPartnerGoals] = useState<SavingsGoal[]>([]);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataSubscriptionRef = useRef<(() => void) | null>(null);
  const partnerSubscriptionRef = useRef<(() => void) | null>(null);
  const isRemoteUpdate = useRef(false);
  const latestDataRef = useRef<any>(null);
  
  const stateRef = useRef({ 
      selectedTaskId, showSettings, showProfileMenu, isSidebarOpen, currentView 
  });

  useEffect(() => {
      stateRef.current = { selectedTaskId, showSettings, showProfileMenu, isSidebarOpen, currentView };
  }, [selectedTaskId, showSettings, showProfileMenu, isSidebarOpen, currentView]);

  useEffect(() => {
      if (Capacitor.isNativePlatform()) {
          CapacitorApp.removeAllListeners(); 
          CapacitorApp.addListener('backButton', ({ canGoBack }) => {
              const state = stateRef.current;
              if (state.selectedTaskId) {
                  setSelectedTaskId(null);
                  if (window.history.state?.taskId === state.selectedTaskId) window.history.back();
              } else if (state.showSettings) {
                  setShowSettings(false);
              } else if (state.showProfileMenu) {
                  setShowProfileMenu(false);
              } else if (state.isSidebarOpen) {
                  setIsSidebarOpen(false);
              } else if (state.currentView !== ViewType.Inbox) {
                  setCurrentView(ViewType.Inbox);
              } else {
                  CapacitorApp.exitApp();
              }
          });
      }

      const handlePopState = (event: PopStateEvent) => {
          if (stateRef.current.selectedTaskId) setSelectedTaskId(null);
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
      const handleOnline = () => { setIsOnline(true); setSyncStatus('saved'); };
      const handleOffline = () => { setIsOnline(false); setSyncStatus('offline'); };
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
      };
  }, []);

  // --- Helpers ---
  const onTokenExpired = useCallback(() => {
      setAccessToken(null);
      localStorage.removeItem('google_access_token');
  }, []);

  const syncWithGoogleCalendar = useCallback(async (token: string) => {
      if (!token) return;
      setIsSyncingCalendar(true);
      try {
          const now = new Date();
          const start = addMonths(now, -1);
          const end = addMonths(now, 3);
          const events = await fetchCalendarEvents(token, start, end);
          
          setTasks(prev => {
              const existingEventsMap = new Map<string, Task>();
              prev.forEach(t => {
                  if (t.isEvent && t.externalId) {
                      existingEventsMap.set(t.externalId, t);
                  }
              });

              const localTasks = prev.filter(t => !t.isEvent);
              const mergedEvents = events.map(evt => {
                  const existing = evt.externalId ? existingEventsMap.get(evt.externalId) : null;
                  if (existing) {
                      return { 
                          ...evt, 
                          isCompleted: existing.isCompleted, 
                          listId: existing.listId,
                          id: existing.id
                      };
                  }
                  return evt;
              });
              return [...localTasks, ...mergedEvents];
          });
          setLastSynced(new Date());
      } catch (error) {
          console.error("Calendar Sync Error", error);
          if (error instanceof Error && error.message === 'Unauthorized') {
               onTokenExpired();
          }
      } finally {
          setIsSyncingCalendar(false);
      }
  }, [onTokenExpired]);

  // --- Process Incoming Cloud Data with Smart Merge ---
  const processIncomingData = useCallback((data: any) => {
      if (!data) return;
      console.log("Processing incoming data...");
      
      if (data.tasks && Array.isArray(data.tasks)) setTasks(prev => mergeArrays(prev, data.tasks.map((t: any) => ({ ...t, dueDate: t.dueDate ? new Date(t.dueDate) : undefined }))));
      if (data.habits && Array.isArray(data.habits)) setHabits(prev => mergeArrays(prev, data.habits));
      if (data.transactions) setTransactions(prev => mergeArrays(prev, data.transactions));
      if (data.goals) setGoals(prev => mergeArrays(prev, data.goals));
      if (data.debtors) setDebtors(prev => mergeArrays(prev, data.debtors));
      if (data.debts) setDebts(prev => mergeArrays(prev, data.debts));
      if (data.subscriptions) setSubscriptions(prev => mergeArrays(prev, data.subscriptions));
      if (data.investments) setInvestments(prev => mergeArrays(prev, data.investments));
      if (data.lists) setLists(prev => mergeArrays(prev, data.lists));
      if (data.focusCategories) setFocusCategories(prev => mergeArrays(prev, data.focusCategories));
      if (data.focusSessions) setFocusSessions(prev => mergeArrays(prev, data.focusSessions));
      
      if (data.couplesData) {
        setCouplesData((prev: CouplesData) => {
          const updated = {
            ...prev,
            ...data.couplesData,
            myProfile: prev.myProfile,
          };
          
          // Sync shared challenges to habits
          if (data.couplesData.sharedChallenges && Array.isArray(data.couplesData.sharedChallenges)) {
            setHabits(prevHabits => {
              const newHabits = [...prevHabits];
              data.couplesData.sharedChallenges.forEach((challenge: any) => {
                // Only create habit if challenge has a habitId and habit doesn't exist yet
                if (challenge.habitId && !newHabits.find(h => h.id === challenge.habitId)) {
                  const newHabit: any = {
                    id: challenge.habitId,
                    name: challenge.name,
                    icon: challenge.icon,
                    color: challenge.color,
                    description: 'Shared challenge with partner',
                    frequencyType: 'daily',
                    section: 'Others',
                    startDate: new Date(challenge.startDate),
                    endDate: new Date(new Date(challenge.startDate).getTime() + (challenge.durationDays - 1) * 24 * 60 * 60 * 1000),
                    history: {},
                    isArchived: false,
                  };
                  newHabits.push(newHabit);
                }
              });
              return newHabits;
            });
          }
          
          return updated;
        });
      }
      
      if (data.settings) {
          const defaultFeatures = { tasks: true, calendar: true, habits: true, focus: true, notes: true, finance: true };
          const mergedFeatures = { ...defaultFeatures, ...(data.settings.features || {}) };
          setSettings({ ...data.settings, features: mergedFeatures });
      }
  }, []);

  useEffect(() => {
      const partnerId = settings.couples?.partnerId;
      if (partnerId) {
          const unsub = subscribeToDataChanges(partnerId, (data) => {
              if (data) {
                  if (data.transactions && Array.isArray(data.transactions)) {
                      const pTransactions = data.transactions.map((t: any) => ({ ...t, paidBy: t.paidBy || partnerId }));
                      setPartnerTransactions(pTransactions);
                  }
                  if (data.goals && Array.isArray(data.goals)) setPartnerGoals(data.goals);
              }
          });
          partnerSubscriptionRef.current = unsub;
      } else {
          setPartnerTransactions([]);
          setPartnerGoals([]);
      }
      return () => { if (partnerSubscriptionRef.current) partnerSubscriptionRef.current(); };
  }, [settings.couples?.partnerId]);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (u) => {
      setUser(u);
      if (u) {
        // Initialize notification role services and trigger permission dialogs
        const context = createNotificationRoleContext(u);
        await initializeRoleServices(context);

        // Initial Fetch
        const remoteData = await loadUserDataFromFirestore(u.uid);
        if (remoteData) {
          isRemoteUpdate.current = true;
          processIncomingData(remoteData);
          setLastSynced(new Date());
          // Wait a bit before allowing local updates to sync back to avoid race
          setTimeout(() => { isRemoteUpdate.current = false; }, 2000);
        } else {
            // New user or no data on cloud, force immediate save of local data to cloud
            setSyncStatus('saving');
            await saveUserDataToFirestore(u.uid, { tasks, lists, habits, focusCategories, focusSessions, transactions, debtors, debts, goals, subscriptions, investments, settings });
            setSyncStatus('saved');
        }

        // Realtime Listener for user data
        const unsubData = subscribeToDataChanges(u.uid, (data) => {
            if (!isRemoteUpdate.current) {
                isRemoteUpdate.current = true;
                processIncomingData(data);
                setLastSynced(new Date());
                setTimeout(() => { isRemoteUpdate.current = false; }, 1000);
            }
            
            // Set up or update couple data listener if user has a coupleId
            if (data.isCoupled && data.coupleId) {
              if (partnerSubscriptionRef.current) {
                partnerSubscriptionRef.current();
              }
              partnerSubscriptionRef.current = subscribeToCoupleData(data.coupleId, (coupleData) => {
                setCouplesData(prev => ({
                  ...prev,
                  ...coupleData,
                  myProfile: {
                    ...prev.myProfile,
                    uid: u.uid,
                    displayName: data.displayName || u.displayName || 'You',
                    photoURL: data.photoURL || u.photoURL,
                  },
                }));
              });
            } else if (partnerSubscriptionRef.current) {
              // User is no longer coupled, unsubscribe from couple data
              partnerSubscriptionRef.current();
              partnerSubscriptionRef.current = null;
            }
        });
        dataSubscriptionRef.current = unsubData;
        if (accessToken) syncWithGoogleCalendar(accessToken);
      } else {
        if (dataSubscriptionRef.current) {
            dataSubscriptionRef.current();
            dataSubscriptionRef.current = null;
        }
        if (partnerSubscriptionRef.current) {
            partnerSubscriptionRef.current();
            partnerSubscriptionRef.current = null;
        }
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, [accessToken, syncWithGoogleCalendar, processIncomingData]);

  // --- Auto-Save Logic ---
  useEffect(() => {
      if (!isAuthReady) return; 
      const currentData = { tasks, lists, habits, focusCategories, focusSessions, transactions, debtors, debts, goals, subscriptions, investments, settings, couplesData };
      latestDataRef.current = currentData;
      
      // Save to Local Storage immediately
      setTimeout(() => {
          saveToStorage(STORAGE_KEYS.TASKS, tasks);
          saveToStorage(STORAGE_KEYS.LISTS, lists);
          saveToStorage(STORAGE_KEYS.HABITS, habits);
          saveToStorage(STORAGE_KEYS.FOCUS, focusCategories);
          saveToStorage(STORAGE_KEYS.FOCUS_SESSIONS, focusSessions);
          saveToStorage(STORAGE_KEYS.TRANSACTIONS, transactions);
          saveToStorage(STORAGE_KEYS.DEBTORS, debtors);
          saveToStorage(STORAGE_KEYS.DEBTS, debts);
          saveToStorage(STORAGE_KEYS.GOALS, goals);
          saveToStorage(STORAGE_KEYS.SUBSCRIPTIONS, subscriptions);
          saveToStorage(STORAGE_KEYS.INVESTMENTS, investments);
          saveToStorage(STORAGE_KEYS.SETTINGS, settings);
          saveToStorage(STORAGE_KEYS.COUPLES_DATA, couplesData);
      }, 0);

      // Debounce Save to Firestore
      if (user && !isRemoteUpdate.current) {
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          setSyncStatus('saving');
          saveTimeoutRef.current = setTimeout(() => {
              saveUserDataToFirestore(user.uid, currentData);
              setSyncStatus('saved');
          }, 2000);
      }
  }, [tasks, lists, habits, focusCategories, focusSessions, transactions, debtors, debts, goals, subscriptions, investments, settings, couplesData, user, isAuthReady]);

  // --- Handlers ---
  const handleAddTask = useCallback((task: Task) => setTasks(prev => [...prev, task]), []);
  
  const handleUpdateTask = useCallback((task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    
    // Cross-sync: Update Google Calendar if linked
    if (accessToken && task.externalId) {
        updateCalendarEvent(accessToken, task).catch(err => console.error("Failed to update GCal event", err));
    }
  }, [accessToken]);

  const handleToggleTask = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isCompleted: !t.isCompleted, updatedAt: new Date() } : t));
    playAlarmSound();
  }, []);

  const handleDeleteTask = useCallback((taskId: string) => {
     // Find the task before removing/marking deleted to check if it's an external event
     const taskToDelete = tasks.find(t => t.id === taskId);
     setTasks(prev => prev.map(t => t.id === taskId ? { ...t, isDeleted: true, updatedAt: new Date() } : t));
     
     // Cross-sync: Delete from Google Calendar if linked
     if (taskToDelete?.externalId && accessToken) {
         deleteCalendarEvent(accessToken, taskToDelete.externalId).catch(err => console.error("Failed to delete GCal event", err));
     }
  }, [tasks, accessToken]);
  
  const handleLogin = async () => {
    try {
      const { user, accessToken } = await loginWithGoogle();
      setUser(user);
      setAccessToken(accessToken);
      if (accessToken) { localStorage.setItem('google_access_token', accessToken); syncWithGoogleCalendar(accessToken); }
    } catch (error: any) { 
      console.error("Login failed:", error); 
      const errorMsg = error.message || "Please try again.";
      const displayMsg = errorMsg.includes('\n') 
        ? errorMsg 
        : `Login failed: ${errorMsg}`;
      alert(displayMsg); 
    }
  };
  const handleLogout = async () => { await logoutUser(); setUser(null); setAccessToken(null); };

  const handleManualSync = async () => {
      if(!user) return;
      setSyncStatus('saving');
      const currentData = { tasks, lists, habits, focusCategories, focusSessions, transactions, debtors, debts, goals, subscriptions, investments, settings, couplesData };
      await saveUserDataToFirestore(user.uid, currentData);
      
      const remoteData = await loadUserDataFromFirestore(user.uid);
      if(remoteData) {
          processIncomingData(remoteData);
          alert("Sync complete. Data merged from cloud.");
      } else {
          alert("Sync complete. Local data uploaded.");
      }
      setSyncStatus('saved');
  };

  const handleLinkPartner = useCallback(async (inviteCode: string) => {
    if (!user?.uid) throw new Error('User not authenticated');
    try {
      // Use atomic transaction to link partner
      const coupleId = await linkPartnerByCode(user.uid, inviteCode);
      
      // Fetch updated user data to get partner info
      const updatedUserData = await loadUserDataFromFirestore(user.uid);
      
      if (updatedUserData && updatedUserData.partnerUid) {
        // Fetch partner profile
        const partnerData = await loadUserDataFromFirestore(updatedUserData.partnerUid);
        
        // Update local state
        setCouplesData(prev => ({
          ...prev,
          partnerProfile: {
            uid: updatedUserData.partnerUid,
            displayName: partnerData?.displayName || 'Partner',
            photoURL: partnerData?.photoURL,
            status: 'online',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }));
      }
      
      return coupleId;
    } catch (error: any) {
      console.error('Failed to link partner:', error);
      throw new Error(error.message || 'Failed to link partner');
    }
  }, [user?.uid]);

  return (
    <div className="flex h-screen w-full bg-[#eef0f6] dark:bg-[#09090b] text-slate-900 dark:text-slate-100 transition-colors duration-300 p-0 md:p-3 gap-3 overflow-hidden">
        {/* Sidebar as a Floating Card on Desktop */}
        <Sidebar 
            currentView={currentView}
            onChangeView={(view) => { setCurrentView(view); setIsSidebarOpen(false); }}
            lists={lists}
            enabledFeatures={Object.keys(settings.features || {}).filter(k => settings.features![k as keyof typeof settings.features])}
            onOpenSettings={() => setShowSettings(true)}
            onOpenProfile={() => setShowProfileMenu(true)}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            onAddList={(name, color) => setLists([...lists, { id: Date.now().toString(), name, color, updatedAt: new Date() }])}
            onDeleteList={(id) => setLists(lists.filter(l => l.id !== id))}
            onSearch={setSearchQuery}
            user={user}
            syncStatus={syncStatus}
        />
        
        {/* Main Content Area - Bento Card Style */}
        <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-white dark:bg-[#0f0f1a] md:rounded-[28px] shadow-none md:shadow-2xl ring-0 md:ring-1 ring-black/5 dark:ring-white/5 transition-all duration-300">
            <Suspense fallback={<LoadingFallback />}>
                {(currentView === ViewType.Inbox || currentView === ViewType.Today || currentView === ViewType.Next7Days || currentView === ViewType.Completed || currentView === ViewType.Trash || currentView === ViewType.All || currentView === ViewType.Search || currentView === ViewType.Archive || currentView === ViewType.Notes || lists.find(l => l.id === currentView)) && (
                    <TaskView 
                        tasks={tasks}
                        lists={lists}
                        viewType={currentView}
                        searchQuery={searchQuery}
                        onToggleTask={handleToggleTask}
                        onAddTask={handleAddTask}
                        onUpdateTask={handleUpdateTask}
                        onSelectTask={(id) => setSelectedTaskId(id)}
                        onDeleteTask={handleDeleteTask}
                        onMenuClick={() => setIsSidebarOpen(true)}
                        onChangeView={setCurrentView}
                        settings={settings}
                        habits={habits}
                        onUpdateHabit={(h) => setHabits(prev => prev.map(old => old.id === h.id ? h : old))}
                        user={user}
                    />
                )}
                {currentView === ViewType.Calendar && (
                    <CalendarView 
                        tasks={tasks}
                        lists={lists}
                        habits={habits}
                        accessToken={accessToken}
                        onToggleTask={handleToggleTask}
                        onSelectTask={(id) => setSelectedTaskId(id)}
                        onUpdateTask={handleUpdateTask}
                        onMenuClick={() => setIsSidebarOpen(true)}
                        onConnectGCal={handleLogin}
                        onSync={() => accessToken && syncWithGoogleCalendar(accessToken)}
                        onTokenExpired={onTokenExpired}
                        isSyncing={isSyncingCalendar}
                        user={user}
                    />
                )}
                {currentView === ViewType.Habits && (
                    <HabitsModule
                        habits={habits}
                        onToggleHabit={(id, date) => setHabits(prev => prev.map(h => {
                            if (h.id === id) {
                                const newHistory = { ...h.history };
                                if (newHistory[date]?.completed) delete newHistory[date];
                                else newHistory[date] = { completed: true, timestamp: Date.now() };
                                return { ...h, history: newHistory };
                            }
                            return h;
                        }))}
                        onUpdateHabit={(h) => setHabits(prev => prev.map(old => old.id === h.id ? h : old))}
                        onAddHabit={(h) => setHabits([...habits, h])}
                        onDeleteHabit={(id) => setHabits(prev => prev.map(h => h.id === id ? { ...h, isArchived: true } : h))}
                        onMenuClick={() => setIsSidebarOpen(true)}
                        onOpenStats={() => setCurrentView(ViewType.HabitStats)}
                        onStartFocus={(habitId) => {
                            const habit = habits.find(h => h.id === habitId);
                            const tempTask: Task = {
                                id: `habit-${habitId}`,
                                title: habit?.name || "Habit Focus",
                                isCompleted: false,
                                priority: 0,
                                listId: 'focus',
                                tags: ['Habit'],
                                subtasks: [],
                                attachments: [],
                                createdAt: new Date()
                            };
                            if (!tasks.find(t => t.id === tempTask.id)) setTasks(prev => [...prev, tempTask]);
                            setFocusTaskId(tempTask.id);
                            setCurrentView(ViewType.Focus);
                        }}
                        user={user}
                        setCurrentView={setCurrentView}
                    />
                )}
                {currentView === ViewType.HabitStats && (
                    <HabitsModule
                        habits={habits}
                        onClose={() => setCurrentView(ViewType.Habits)}
                        viewType="stats"
                        onMenuClick={() => setIsSidebarOpen(true)}
                    />
                )}
                {currentView === ViewType.Focus && (
                    <FocusView 
                        categories={focusCategories}
                        onAddCategory={(c) => setFocusCategories([...focusCategories, c])}
                        activeTask={tasks.find(t => t.id === focusTaskId)}
                        onFocusComplete={(s) => setFocusSessions(prev => [...prev, s])}
                        onMenuClick={() => setIsSidebarOpen(true)}
                        focusSessions={focusSessions}
                        unlockedTrees={settings.focus?.unlockedTrees}
                        onUnlockTree={(treeId) => {
                            const newUnlocked = [...(settings.focus?.unlockedTrees || []), treeId];
                            setSettings({ ...settings, focus: { ...settings.focus, unlockedTrees: newUnlocked } });
                        }}
                    />
                )}
                {currentView === ViewType.Tags && (
                    <TagsView 
                        tasks={tasks}
                        onUpdateTask={handleUpdateTask}
                        onSelectTask={(id) => setSelectedTaskId(id)}
                        onToggleTask={handleToggleTask}
                        onMenuClick={() => setIsSidebarOpen(true)}
                    />
                )}
                {currentView === ViewType.Finance && (
                    <FinanceView 
                        transactions={transactions}
                        partnerTransactions={partnerTransactions}
                        onAddTransaction={(t) => setTransactions([...transactions, t])}
                        onUpdateTransaction={(t) => setTransactions(prev => prev.map(old => old.id === t.id ? t : old))}
                        onDeleteTransaction={(id) => setTransactions(prev => prev.filter(t => t.id !== id))}
                        onMenuClick={() => setIsSidebarOpen(true)}
                        onAddTransactions={(txs) => setTransactions([...transactions, ...txs])}
                        debtors={debtors}
                        debts={debts}
                        onAddDebtor={(d) => setDebtors([...debtors, d])}
                        onAddDebt={(d) => setDebts([...debts, d])}
                        onUpdateDebt={(d) => setDebts(prev => prev.map(old => old.id === d.id ? d : old))}
                        onDeleteDebt={(id) => setDebts(prev => prev.filter(d => d.id !== id))}
                        goals={settings.couples?.partnerId && partnerGoals.length > 0 ? [...goals, ...partnerGoals] : goals}
                        onAddGoal={(g) => setGoals([...goals, g])}
                        onUpdateGoal={(g) => setGoals(prev => prev.map(old => old.id === g.id ? g : old))}
                        onDeleteGoal={(id) => setGoals(prev => prev.filter(g => g.id !== id))}
                        subscriptions={subscriptions}
                        onAddSubscription={(s) => setSubscriptions([...subscriptions, s])}
                        onUpdateSubscription={(s) => setSubscriptions(prev => prev.map(old => old.id === s.id ? s : old))}
                        onDeleteSubscription={(id) => setSubscriptions(prev => prev.filter(s => s.id !== id))}
                        investments={investments}
                        onAddInvestment={(i) => setInvestments([...investments, i])}
                        onUpdateInvestment={(i) => setInvestments(prev => prev.map(old => old.id === i.id ? i : old))}
                        onDeleteInvestment={(id) => setInvestments(prev => prev.filter(i => i.id !== id))}
                        user={user}
                    />
                )}
                {currentView === ViewType.Notes && (
                    <NotesView 
                        onMenuClick={() => setIsSidebarOpen(true)}
                    />
                )}
                {currentView === ViewType.Together && (
                    <Suspense fallback={<LoadingFallback />}>
                        <CouplesView
                            couplesData={{
                                ...couplesData,
                                myProfile: {
                                    ...couplesData.myProfile,
                                    uid: user?.uid || '',
                                    displayName: user?.displayName || 'You',
                                    photoURL: user?.photoURL || undefined,
                                },
                            }}
                            onUpdateCouplesData={setCouplesData}
                            onLinkPartner={handleLinkPartner}
                            onUpdateHabits={setHabits}
                            onAddTask={handleAddTask}
                            onMenuClick={() => setIsSidebarOpen(true)}
                            myUid={user?.uid || ''}
                            habits={habits}
                        />
                    </Suspense>
                )}
            </Suspense>
            
            <MobileNavigation 
                currentView={currentView} 
                onChangeView={setCurrentView} 
                onMenuClick={() => setIsSidebarOpen(true)} 
            />
        </main>
        
        {/* Global Modals */}
        {showSettings && (
            <Suspense fallback={null}>
                <SettingsView 
                    onClose={() => setShowSettings(false)}
                    settings={settings}
                    onUpdateSettings={setSettings}
                    theme={theme}
                    onThemeToggle={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                    onOpenCompletedTasks={() => { setShowSettings(false); setCurrentView(ViewType.Completed); }}
                    user={user}
                    onLogin={handleLogin}
                    onLogout={handleLogout}
                />
            </Suspense>
        )}
        
        {showProfileMenu && (
            <Suspense fallback={null}>
                <ProfileMenu 
                    user={user}
                    onClose={() => setShowProfileMenu(false)}
                    onLogout={handleLogout}
                    onLogin={handleLogin}
                    onSettings={() => { setShowProfileMenu(false); setShowSettings(true); }}
                    onSync={handleManualSync}
                />
            </Suspense>
        )}

        {selectedTaskId && (
            <Suspense fallback={null}>
                <TaskDetailView 
                    task={tasks.find(t => t.id === selectedTaskId) || { id: selectedTaskId, title: '', isCompleted: false, priority: 0, listId: 'inbox', tags: [], subtasks: [], attachments: [] }}
                    tasks={tasks}
                    lists={lists}
                    onClose={() => setSelectedTaskId(null)}
                    onUpdateTask={handleUpdateTask}
                    onAddTask={handleAddTask}
                    onDeleteTask={handleDeleteTask}
                    onStartFocus={(id) => { setSelectedTaskId(null); setFocusTaskId(id); setCurrentView(ViewType.Focus); }}
                    onSelectTask={(id) => setSelectedTaskId(id)}
                    settings={settings}
                />
            </Suspense>
        )}
    </div>
  );
};

export default App;
