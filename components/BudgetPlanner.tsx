import React, { useState, useMemo } from 'react';
import { PlusCircle, Trash2, TrendingUp, AlertTriangle, ChevronLeft } from 'lucide-react';
import { Transaction, BudgetCategory } from '../types';

interface BudgetPlannerProps {
  transactions: Transaction[];
  budgets: BudgetCategory[];
  onAddBudget: (b: BudgetCategory) => void;
  onUpdateBudget: (b: BudgetCategory) => void;
  onDeleteBudget: (id: string) => void;
  onClose: () => void;
}

const CATEGORY_COLORS = [
  '#f97316','#14b8a6','#8b5cf6','#f43f5e','#f59e0b',
  '#06b6d4','#10b981','#ec4899','#6366f1','#84cc16',
];

const thisMonthStr = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const BudgetPlanner: React.FC<BudgetPlannerProps> = ({
  transactions, budgets, onAddBudget, onUpdateBudget, onDeleteBudget, onClose,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('Food');
  const [limit, setLimit] = useState('');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);

  const month = thisMonthStr();

  const spending = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'debit' && t.date.startsWith(month))
      .forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return map;
  }, [transactions, month]);

  const handleAdd = () => {
    if (!category || !limit) return;
    const b: BudgetCategory = {
      id: Date.now().toString(),
      category, monthlyLimit: parseFloat(limit), color,
      createdAt: new Date(), updatedAt: new Date(),
    };
    onAddBudget(b);
    setShowForm(false); setCategory('Food'); setLimit('');
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900 animate-slide-up">
      {/* Header */}
      <div className="pt-safe shrink-0 border-b border-slate-100 dark:border-slate-800">
        <div className="h-14 flex items-center px-4 gap-3">
          <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white flex-1">Budget Planner</h1>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1 bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow">
            <PlusCircle size={14} /> New Budget
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-safe">
        {budgets.map(b => {
          const spent = spending[b.category] || 0;
          const percent = Math.min((spent / b.monthlyLimit) * 100, 100);
          const isOver = spent > b.monthlyLimit;
          return (
            <div key={b.id} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                  <span className="font-bold text-slate-800 dark:text-white">{b.category}</span>
                </div>
                <button onClick={() => onDeleteBudget(b.id)} className="text-slate-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-500 dark:text-slate-400">Spent: ${spent.toFixed(2)}</span>
                <span className="text-slate-800 dark:text-slate-200 font-medium">${b.monthlyLimit.toFixed(2)}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`h-full transition-all ${isOver ? 'bg-red-500' : ''}`} style={{ width: `${percent}%`, backgroundColor: !isOver ? b.color : undefined }} />
              </div>
              {isOver && (
                <div className="flex items-center gap-1 mt-2 text-xs text-red-500 font-medium">
                  <AlertTriangle size={12} /> Over budget by ${(spent - b.monthlyLimit).toFixed(2)}
                </div>
              )}
            </div>
          );
        })}
        
        {showForm && (
          <div className="bg-indigo-50 dark:bg-slate-800 rounded-2xl p-4 border border-indigo-200 dark:border-orange-900/40 space-y-3 animate-scale-in">
            <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Category Name"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none" />
            <input type="number" value={limit} onChange={e => setLimit(e.target.value)} placeholder="Monthly Limit"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none" />
            <div className="flex gap-2">
              {CATEGORY_COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className={`w-6 h-6 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-indigo-500' : ''}`} style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 text-sm font-bold text-slate-500 bg-white dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">Cancel</button>
              <button onClick={handleAdd} className="flex-1 py-2 text-sm font-bold text-white bg-gradient-to-br from-orange-500 to-amber-400 rounded-xl">Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
