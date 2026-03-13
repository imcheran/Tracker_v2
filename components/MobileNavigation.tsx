
import React from 'react';
import { ViewType } from '../types';
import { CheckSquare, Calendar, Zap, BarChart2, Repeat, Menu } from 'lucide-react';

interface MobileNavigationProps {
  currentView: ViewType | string;
  onChangeView: (view: ViewType) => void;
  onMenuClick: () => void;
}

const navItems = [
  { view: ViewType.Today,    icon: CheckSquare, label: 'Today'    },
  { view: ViewType.Calendar, icon: Calendar,    label: 'Calendar' },
  { view: ViewType.Habits,   icon: Repeat,      label: 'Habits'   },
  { view: ViewType.Focus,    icon: Zap,         label: 'Focus'    },
  { view: ViewType.Finance,  icon: BarChart2,   label: 'Finance'  },
];

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentView, onChangeView, onMenuClick,
}) => {
  return (
    <div className="md:hidden flex justify-center pb-safe px-4 pb-3 pt-1 absolute bottom-0 left-0 right-0 z-40 pointer-events-none">
      <nav className="mobile-nav-float pointer-events-auto flex items-center gap-1 rounded-2xl px-2 py-2 w-full max-w-sm">
        {/* Hamburger */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-1 flex-shrink-0" />

        {/* Nav items */}
        {navItems.map(({ view, icon: Icon, label }) => {
          const isActive = currentView === view;
          return (
            <button
              key={view}
              onClick={() => onChangeView(view)}
              className={`flex flex-col items-center justify-center flex-1 h-12 rounded-xl gap-0.5 transition-all duration-200 relative
                ${isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              aria-label={label}
            >
              {isActive && (
                <span className="absolute inset-0 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl" />
              )}
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} className="relative z-10" />
              <span className={`text-[10px] font-medium relative z-10 leading-none
                ${isActive ? 'opacity-100' : 'opacity-70'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
