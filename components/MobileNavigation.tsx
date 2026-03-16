
import React from 'react';
import { Layers, Calendar, Clock, Menu } from 'lucide-react';
import { ViewType } from '../types';

interface MobileNavigationProps {
  currentView: ViewType | string;
  onChangeView: (view: ViewType) => void;
  onMenuClick: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = React.memo(
  ({ currentView, onChangeView, onMenuClick }) => {
    const navItems = [
      { id: ViewType.Inbox,    icon: Layers,   label: 'Tasks',    activeClass: 'from-orange-500 to-amber-400',  glowClass: 'shadow-orange-400/40'  },
      { id: ViewType.Calendar, icon: Calendar, label: 'Calendar', activeClass: 'from-teal-500 to-cyan-400',     glowClass: 'shadow-teal-400/40'    },
      { id: ViewType.Focus,    icon: Clock,    label: 'Focus',    activeClass: 'from-violet-500 to-purple-400', glowClass: 'shadow-violet-400/40'  },
    ];

    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
        <div className="mx-3 mb-2 rounded-2xl border border-white/60 dark:border-white/10 shadow-xl shadow-black/10 dark:shadow-black/40"
          style={{ background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <div className="flex justify-between items-center h-16 px-3">
            {navItems.map(item => {
              const isActive =
                currentView === item.id ||
                (item.id === ViewType.Inbox &&
                  ([ViewType.All, ViewType.Today, ViewType.Next7Days] as string[]).includes(currentView as string));
              return (
                <button
                  key={item.id}
                  onClick={() => onChangeView(item.id)}
                  className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 group relative"
                >
                  <div className={`p-2 rounded-xl transition-all duration-300 ${
                    isActive ? `bg-gradient-to-br ${item.activeClass} text-white shadow-lg ${item.glowClass} -translate-y-1` : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}>
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                  <span className={`text-[10px] font-bold transition-all duration-300 ${
                    isActive ? 'text-slate-800 dark:text-slate-200 opacity-100 translate-y-0' : 'text-slate-500 dark:text-slate-400 opacity-0 translate-y-2 absolute bottom-0'
                  }`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-1" />
            <button
              onClick={onMenuClick}
              className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 group relative"
            >
              <div className="p-2 rounded-xl transition-all duration-300 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <Menu size={20} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 opacity-0 translate-y-2 absolute bottom-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                Menu
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }
);
