
import React from 'react';
import { ViewType } from '../types';
import { CheckSquare, Calendar, Zap, Repeat, Menu, Heart, Wallet } from 'lucide-react';

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
  { view: ViewType.Together, icon: Heart,       label: 'Together' },
];

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentView, onChangeView, onMenuClick,
}) => {
  return (
    <div className="md:hidden flex justify-center pb-safe px-4 pb-3 pt-1 absolute bottom-0 left-0 right-0 z-40 pointer-events-none">
      <nav className="mobile-nav-float pointer-events-auto flex items-center gap-0.5 rounded-2xl px-2 py-2 w-full max-w-md">
        {/* Hamburger / More */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} />
          <span className="text-[9px] font-medium opacity-70 mt-0.5">More</span>
        </button>

        <div className="w-px h-6 bg-slate-200 dark:bg-white/10 mx-0.5 flex-shrink-0" />

        {/* Nav items */}
        {navItems.map(({ view, icon: Icon, label }) => {
          const isActive = currentView === view;
          const isHeart = view === ViewType.Together;
          return (
            <button
              key={view}
              onClick={() => onChangeView(view)}
              className={`flex flex-col items-center justify-center flex-1 h-12 rounded-xl gap-0.5 transition-all duration-200 relative
                ${isActive
                  ? isHeart
                    ? 'text-rose-500 dark:text-rose-400'
                    : 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              aria-label={label}
            >
              {isActive && (
                <span className={`absolute inset-0 rounded-xl ${
                  isHeart 
                    ? 'bg-rose-50 dark:bg-rose-500/10' 
                    : 'bg-indigo-50 dark:bg-indigo-500/10'
                }`} />
              )}
              <Icon 
                size={20} 
                strokeWidth={isActive ? 2.5 : 1.75} 
                className={`relative z-10 ${isHeart && isActive ? 'fill-rose-500 dark:fill-rose-400' : ''}`} 
              />
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
