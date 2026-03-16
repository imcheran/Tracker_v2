import React, { useMemo } from 'react';
import { ChevronLeft, TrendingUp, TrendingDown, Minus, Wallet, PiggyBank, Briefcase, CreditCard } from 'lucide-react';
import { Transaction, SavingsGoal, Debt, Investment } from '../types';

interface NetWorthDashboardProps {
  transactions: Transaction[];
  goals: SavingsGoal[];
  debts: Debt[];
  investments: Investment[];
  onClose: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export const NetWorthDashboard: React.FC<NetWorthDashboardProps> = ({
  transactions, goals, debts, investments, onClose,
}) => {
  const stats = useMemo(() => {
    const totalSavings = goals.reduce((s, g) => s + g.currentAmount, 0);
    const investmentValue = investments.reduce((s, i) => s + i.units * (i.currentPrice ?? i.avgPrice), 0);
    const totalDebt = debts.filter(d => d.type === 'Borrow').reduce((s, d) => s + d.amount, 0);
    const moneyOwed = debts.filter(d => d.type === 'Lend').reduce((s, d) => s + d.amount, 0);
    const cashBalance = transactions.reduce((s, t) => t.type === 'credit' ? s + t.amount : s - t.amount, 0);
    const assets = totalSavings + investmentValue + moneyOwed + Math.max(cashBalance, 0);
    const liabilities = totalDebt;
    const netWorth = assets - liabilities;
    return { totalSavings, investmentValue, totalDebt, moneyOwed, cashBalance, assets, liabilities, netWorth };
  }, [transactions, goals, debts, investments]);

  const cards = [
    { label: 'Cash Balance', value: stats.cashBalance, icon: Wallet, color: '#14b8a6', bg: 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/10' },
    { label: 'Savings Goals', value: stats.totalSavings, icon: PiggyBank, color: '#f97316', bg: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/10' },
    { label: 'Investments', value: stats.investmentValue, icon: Briefcase, color: '#8b5cf6', bg: 'from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/10' },
    { label: 'Debts & Liabilities', value: stats.totalDebt, icon: CreditCard, color: '#f43f5e', bg: 'from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/10' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900 animate-slide-up">
      <div className="pt-safe shrink-0 border-b border-slate-100 dark:border-slate-800">
        <div className="h-14 flex items-center px-4 gap-3">
          <button onClick={onClose} className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <ChevronLeft size={22} />
          </button>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white flex-1">Net Worth</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-safe">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
          <p className="text-slate-400 text-sm font-medium mb-1">Total Net Worth</p>
          <h2 className="text-4xl font-black tracking-tight mb-4">{fmt(stats.netWorth)}</h2>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700/50">
            <div>
              <p className="text-slate-400 text-xs mb-1">Total Assets</p>
              <p className="text-lg font-bold text-teal-400">{fmt(stats.assets)}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs mb-1">Total Liabilities</p>
              <p className="text-lg font-bold text-rose-400">{fmt(stats.liabilities)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {cards.map((c, i) => (
            <div key={i} className={`bg-gradient-to-br ${c.bg} rounded-2xl p-4 border border-white/50 dark:border-slate-800`}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: `${c.color}20`, color: c.color }}>
                <c.icon size={16} />
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">{c.label}</p>
              <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{fmt(c.value)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
